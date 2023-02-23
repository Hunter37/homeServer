package http

import (
	"sync"

	"homeServer/threadpool"
)

type HttpPool struct {
	pool  *threadpool.Pool
	queue []*httpJob
	lock  sync.Mutex
}

type httpJob struct {
	Url       string
	RespBody  string
	RespError error
	Done      chan bool
}

func (job *httpJob) Do() {
	success := false
	defer func() {
		job.Done <- success
	}()

	job.RespBody, job.RespError = httpGet(job.Url)
	if job.RespError == nil {
		success = true
	}
}

func (pool *HttpPool) Get(url string, highPriority bool) (string, error) {
	job := &httpJob{
		Url:  url,
		Done: make(chan bool),
	}

	if highPriority {
		pool.pool.Submit(job)
	} else if ok := pool.pool.Enqueue(job); !ok {
		pool.enqueue(job)
	}

	pool.waitDone(job)

	return job.RespBody, job.RespError
}

func (pool *HttpPool) BatchGet(urls []string, highPriority bool) []string {
	jobs := make([]*httpJob, 0, len(urls))
	for _, url := range urls {
		job := &httpJob{
			Url:  url,
			Done: make(chan bool, 2),
		}

		if highPriority {
			pool.pool.Submit(job)
		} else if ok := pool.pool.Enqueue(job); !ok {
			pool.enqueue(job)
		}

		jobs = append(jobs, job)
	}

	result := make([]string, 0, len(urls))
	for _, job := range jobs {
		pool.waitDone(job)
		result = append(result, job.RespBody)
	}

	return result
}

func (pool *HttpPool) enqueue(job *httpJob) {
	pool.lock.Lock()
	defer pool.lock.Unlock()
	pool.queue = append(pool.queue, job)
}

func (pool *HttpPool) waitDone(job *httpJob) {
	<-job.Done
	pool.lock.Lock()
	defer pool.lock.Unlock()

	for len(pool.queue) > 0 {
		if ok := pool.pool.Enqueue(pool.queue[0]); ok {
			pool.queue = pool.queue[1:]
		} else {
			break
		}
	}
}

func (pool *HttpPool) Stop() {
	pool.pool.Stop()
}

func StartHttpPool(maxWorkers int) *HttpPool {
	pool := &HttpPool{
		pool:  threadpool.NewWorkerPool(maxWorkers, maxWorkers*2),
		queue: make([]*httpJob, 0),
		lock:  sync.Mutex{},
	}

	pool.pool.Start()

	return pool
}
