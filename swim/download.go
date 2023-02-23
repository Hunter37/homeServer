package swim

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"homeServer/threadpool"
	"homeServer/utils"
)

type DownloadJob struct {
	lock    *sync.Mutex
	visited *map[string]bool
	pool    *threadpool.Pool
	url     string

	listJob    *int32
	infoJob    *int32
	eventJob   *int32
	runningJob *int32
}

func NewDownloadJob(currentJob *DownloadJob, url string, call func(job *DownloadJob)) {
	currentJob.lock.Lock()
	defer currentJob.lock.Unlock()

	if _, ok := (*currentJob.visited)[url]; !ok {
		(*currentJob.visited)[url] = true

		dj := &DownloadJob{
			lock:       currentJob.lock,
			visited:    currentJob.visited,
			pool:       currentJob.pool,
			url:        url,
			listJob:    currentJob.listJob,
			infoJob:    currentJob.infoJob,
			eventJob:   currentJob.eventJob,
			runningJob: currentJob.runningJob,
		}

		atomic.AddInt32(currentJob.runningJob, 1)
		call(dj)
	}
}

func CheckLastJob(dj *DownloadJob) {
	count := atomic.AddInt32(dj.runningJob, -1)
	if count == 0 {
		// this is the last one
		utils.Log(fmt.Sprintf("%s \033[36m%s [%d]+[%d]+[%d]=[%d]\033[0m\n", utils.GetLogTime(), "Background download finished",
			atomic.LoadInt32(dj.listJob), atomic.LoadInt32(dj.infoJob), atomic.LoadInt32(dj.eventJob), len(*dj.visited)))
	}
}

func createInt32() *int32 {
	i := int32(0)
	return &i
}

func StartBackgroundDownloadPool(maxWorkers int) func() {
	pool := threadpool.NewWorkerPool(maxWorkers, maxWorkers*2)
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
				lock:       &sync.Mutex{},
				visited:    &visited,
				pool:       pool,
				listJob:    createInt32(),
				infoJob:    createInt32(),
				eventJob:   createInt32(),
				runningJob: createInt32(),
			}

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
							job.pool.Enqueue(&InfoJob{DownloadJob: *job})
						})
					} else {
						minutes = utils.ParseInt(parts[0])
					}
					continue
				} else if len(parts) == 2 {
					top := utils.ParseInt(parts[0])
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
