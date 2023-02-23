package swim

import (
	"sort"
	"sync"
	"sync/atomic"

	"homeServer/swim/model"
	"homeServer/utils"
)

type EventJob struct {
	DownloadJob
	sid       string
	count     *int32 // remaining stroke job related to this sid
	ranks     *[]model.Rankings
	ranksLock *sync.Mutex
}

var sortMap = map[string]int{
	model.SCY:    100000,
	model.LCM:    200000,
	model.Free:   10000,
	model.Back:   20000,
	model.Breast: 30000,
	model.Fly:    40000,
	model.IM:     50000,
}

func (job *EventJob) Do() {
	defer CheckLastJob(&job.DownloadJob)
	atomic.AddInt32(job.eventJob, 1)

	page, err := httpPool.Get(job.url, false)
	if err != nil {
		utils.LogError(err, "Download swimmer stroke page failed: "+job.url)
	} else {
		page = removeFooter(removeHTMLSpace(page))

		// extract events data
		extractEventDataFromPage(job.sid, page)

		// extract rank data in this page
		for _, rank := range getRankDataFromPage(job.url, page) {
			func() {
				job.ranksLock.Lock()
				defer job.ranksLock.Unlock()
				*job.ranks = append(*job.ranks, rank)
			}()
		}
	}

	if 0 == atomic.AddInt32(job.count, -1) {
		ranks := *job.ranks
		sort.Slice(ranks, func(i, j int) bool {
			return sortMap[ranks[i].Course]+sortMap[ranks[i].Stroke]+ranks[i].Length <
				sortMap[ranks[j].Course]+sortMap[ranks[j].Stroke]+ranks[j].Length
		})

		model.UpdateRankings(job.sid, &ranks)
	}
}
