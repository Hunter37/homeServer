package swim

import (
	"sync"
	"sync/atomic"

	"homeServer/regex"
	"homeServer/swim/model"
	"homeServer/utils"
)

type InfoJob struct {
	DownloadJob
}

func (job *InfoJob) Do() {
	defer CheckLastJob(&job.DownloadJob)
	atomic.AddInt32(job.infoJob, 1)

	sid := regex.MatchOne(job.url, "/([^/]+)_meets.html", 1)

	page, err := httpPool.Get(job.url, false)
	if err != nil {
		utils.LogError(err, "Download swimmer info failed: "+job.url)
		return
	}

	extractSiwmmerInfoFromPage(sid, page)

	urls := getAllEventLinks(page)
	strokeJobCount := int32(len(urls))
	ranks := make([]model.Rankings, 0, len(urls)*2)

	for _, url := range urls {
		NewDownloadJob(&job.DownloadJob, url, func(job *DownloadJob) {
			job.pool.Enqueue(&EventJob{
				DownloadJob: *job,
				sid:         sid,
				count:       &strokeJobCount,
				ranks:       &ranks,
				ranksLock:   &sync.Mutex{},
			})
		})
	}
}
