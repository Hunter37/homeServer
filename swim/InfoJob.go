package swim

import (
	"sync"
	"sync/atomic"

	"homeServer/swim/model"
	"homeServer/utils"
)

type InfoJob struct {
	DownloadJob
}

func (job *InfoJob) Do() {
	defer CheckLastJob(&job.DownloadJob)
	atomic.AddInt32(job.infoJob, 1)

	swimmer := GetCachedSwimmerFromMeetUrl(job.url)
	swimmer.Rankings = make([]model.Rankings, 0, len(swimmer.Rankings)) // clean the rankings, we need to rebuild it
	strokesLock := &sync.Mutex{}
	rankingLock := &sync.Mutex{}

	page, err := httpPool.Get(job.url, false)
	if err != nil {
		utils.LogError(err, "Download swimmer info failed: "+job.url)
		return
	}

	extractSiwmmerInfoFromPage(page, swimmer)

	urls := getAllEventLinks(page)
	strokeJobCount := int32(len(urls))

	for _, url := range urls {
		NewDownloadJob(&job.DownloadJob, url, func(job *DownloadJob) {
			job.pool.Enqueue(&EventJob{
				DownloadJob: *job,
				swimmer:     swimmer,
				strokesLock: strokesLock,
				rankingLock: rankingLock,
				count:       &strokeJobCount,
			})
		})
	}
}
