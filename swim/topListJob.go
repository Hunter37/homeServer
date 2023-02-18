package swim

import (
	"homeServer/http"
	"homeServer/utils"
)

type TopListJob struct {
	DownloadJob
	top int
}

func (job *TopListJob) Do() {
	defer CheckLastJob(&job.DownloadJob)

	page, err := http.HttpGet(job.url)
	if err != nil {
		utils.LogError(err, "Download top list failed: "+job.url)
		return
	}

	urls := extractTopListFromPage(job.url, page)
	for _, url := range urls {
		if job.top == 0 {
			break
		}
		job.top--

		NewDownloadJob(&job.DownloadJob, url, func(job *DownloadJob) {
			job.pool.Enqueue(&SwimmerJob{DownloadJob: *job})
		})
	}
}
