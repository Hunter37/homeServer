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
	swimmer     *model.Swimmer
	strokesLock *sync.Mutex
	rankingLock *sync.Mutex
	count       *int32 // remaining stroke job related to this sid
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
		utils.LockOperation(job.strokesLock, func() {
			extractEventDataFromPage(page, job.swimmer)
		})

		// extract rank data in this page
		for _, rank := range getRankDataFromPage(job.url, page) {
			utils.LockOperation(job.rankingLock, func() {
				job.swimmer.Rankings = append(job.swimmer.Rankings, rank)
			})
		}
	}

	if atomic.AddInt32(job.count, -1) == 0 {
		ranks := job.swimmer.Rankings
		sort.Slice(ranks, func(i, j int) bool {
			return sortMap[ranks[i].Course]+sortMap[ranks[i].Stroke]+ranks[i].Length <
				sortMap[ranks[j].Course]+sortMap[ranks[j].Stroke]+ranks[j].Length
		})

		job.swimmer.Rankings = ranks

		// this is the last event job
		model.WriteSwimmerToCache(job.swimmer)
	}
}
