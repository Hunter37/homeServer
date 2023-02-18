package swim

import (
	"sync"

	"homeServer/http"
	"homeServer/regex"
	"homeServer/swim/model"
	"homeServer/utils"
)

type SwimmerJob struct {
	DownloadJob
}

func (job *SwimmerJob) Do() {
	defer CheckLastJob(&job.DownloadJob)

	sid := regex.MatchOne(job.url, "/([^/]+)_meets.html", 1)

	page, err := http.HttpGet(job.url)
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
			job.pool.Enqueue(&StrokeJob{
				DownloadJob: *job,
				sid:         sid,
				count:       &strokeJobCount,
				ranks:       &ranks,
				ranksLock:   &sync.Mutex{},
			})
		})
	}
}
