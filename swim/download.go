package swim

import (
	"bufio"
	"errors"
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
	url string
	top int

	lock    *sync.Mutex
	visited *map[string]bool
	pool    *threadpool.Pool
}

func (dj *DownloadJob) Do() {
	defer func() {
		count := dj.pool.RunningWorkerCount()
		if count == 1 {
			// this is the last one
			utils.Log(fmt.Sprintf("%s \033[36m%s [%d]\033[0m\n", utils.GetLogTime(), "Background download finished", len(*dj.visited)))
		}
	}()

	if strings.Contains(dj.url, `_meets.html`) {
		if _, err := extractSwimmerAllData(dj.url); err != nil {
			utils.LogError(err, "Failed to extract data from: "+dj.url)
		}
		return
	}

	if strings.Contains(dj.url, `/strokes/`) {
		utils.LogError(errors.New("Wrong url!"), dj.url)
		return
	}

	urls := extractTopListFromPage([]string{dj.url})
	for _, url := range urls {
		if dj.top == 0 {
			break
		}
		dj.top--

		job := NewDownloadJob(dj.lock, dj.visited, dj.pool, url, 1)
		if job != nil {
			dj.pool.Enqueue(job)
		}
	}
}

func NewDownloadJob(lock *sync.Mutex, visited *map[string]bool, pool *threadpool.Pool, url string, top int) *DownloadJob {
	lock.Lock()
	defer lock.Unlock()

	if _, ok := (*visited)[url]; !ok {
		(*visited)[url] = true

		return &DownloadJob{
			top:     top,
			url:     url,
			lock:    lock,
			visited: visited,
			pool:    pool,
		}
	}

	return nil
}

func StartBackgroundDownloadPool() func() {
	pool := threadpool.NewWorkerPool(10, 500)
	pool.Start()

	timer := &time.Timer{}

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
			lock := sync.Mutex{}

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
					minutes = model.ParseInt(parts[0])
					continue
				}

				if len(parts) != 2 {
					utils.LogError(errors.New("Wrong line: "), line)
					continue
				}

				job := NewDownloadJob(&lock, &visited, pool, strings.TrimSpace(parts[1]), model.ParseInt(parts[0]))
				if job != nil {
					pool.Enqueue(job)
				}
			}

			timeout := time.Minute * time.Duration(minutes)
			timeoutCh := make(chan bool, 1)
			timer = time.AfterFunc(timeout, func() {
				timeoutCh <- true
			})

			select {
			case <-timeoutCh:
				continue
			case <-quit:
				utils.Log(fmt.Sprintf("%s \033[36m%s\033[0m\n", utils.GetLogTime(), "Stop background download pool"))
				return
			}
		}
	}()

	return func() {
		timer.Stop()
		pool.Stop()
		quit <- true
	}
}
