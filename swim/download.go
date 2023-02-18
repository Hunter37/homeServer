package swim

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"homeServer/swim/model"
	"homeServer/threadpool"
	"homeServer/utils"
)

type DownloadJob struct {
	lock    *sync.Mutex
	visited *map[string]bool
	pool    *threadpool.Pool
	url     string
}

func NewDownloadJob(currentJob *DownloadJob, url string, call func(job *DownloadJob)) {
	currentJob.lock.Lock()
	defer currentJob.lock.Unlock()

	if _, ok := (*currentJob.visited)[url]; !ok {
		(*currentJob.visited)[url] = true

		dj := &DownloadJob{
			lock:    currentJob.lock,
			visited: currentJob.visited,
			pool:    currentJob.pool,
			url:     url,
		}

		call(dj)
	}
}

func CheckLastJob(dj *DownloadJob) {
	count := dj.pool.RunningWorkerCount()
	if count == 1 {
		// this is the last one
		utils.Log(fmt.Sprintf("%s \033[36m%s [%d]\033[0m\n", utils.GetLogTime(), "Background download finished", len(*dj.visited)))
	}
}

func StartBackgroundDownloadPool() func() {
	pool := threadpool.NewWorkerPool(5, 10000)
	pool.Start()

	quit := make(chan bool)
	go func() {
		for {
			listFile, err := os.Open("list.json")
			if err != nil {
				utils.LogError(err, "list file read failed!")
				continue
			}

			utils.Log(fmt.Sprintf("%s \033[36m%s\033[0m\n", utils.GetLogTime(), "Start background downloading"))

			visited := make(map[string]bool, 0)
			dJob := &DownloadJob{
				lock:    &sync.Mutex{},
				visited: &visited,
				pool:    pool}

			minutes := 60
			scanner := bufio.NewScanner(listFile)
			scanner.Split(bufio.ScanLines)
			for scanner.Scan() {
				line := strings.TrimSpace(scanner.Text())
				if len(line) == 0 || strings.Index(line, "//") == 0 {
					continue
				}

				parts := strings.Split(line, ",")
				if len(parts) == 1 {
					if strings.Contains(line, "_meets.html") {
						url := strings.TrimSpace(line)
						NewDownloadJob(dJob, url, func(job *DownloadJob) {
							job.pool.Enqueue(&SwimmerJob{DownloadJob: *job})
						})
					} else {
						minutes = model.ParseInt(parts[0])
					}
					continue
				} else if len(parts) == 2 {
					top := model.ParseInt(parts[0])
					url := strings.TrimSpace(parts[1])
					NewDownloadJob(dJob, url, func(job *DownloadJob) {
						job.pool.Enqueue(&TopListJob{DownloadJob: *job, top: top})
					})
					continue
				}
			}

			select {
			case <-time.After(time.Minute * time.Duration(minutes)):
				continue
			case <-quit:
				utils.Log(fmt.Sprintf("%s \033[36m%s\033[0m\n", utils.GetLogTime(), "Stop background download thread"))
				return
			}
		}
	}()

	return func() {
		quit <- true
		pool.Stop()
	}
}
