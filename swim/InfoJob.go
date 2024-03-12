package swim

import (
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

	err := extractSwimmerAllData(job.url, swimmer, job.phPool)
	if err != nil {
		utils.LogError(err, "Download swimmer info failed: "+job.url)
	}
}
