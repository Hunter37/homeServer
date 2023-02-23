package http

import (
	"homeServer/threadpool"
)

type HttpPool struct {
	pool *threadpool.Pool
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
	} else {
		pool.pool.Enqueue(job)
	}

	<-job.Done
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
		} else {
			pool.pool.Enqueue(job)
		}

		jobs = append(jobs, job)
	}

	result := make([]string, 0, len(urls))
	for _, job := range jobs {
		<-job.Done
		result = append(result, job.RespBody)
	}

	return result
}

func (pool *HttpPool) Stop() {
	pool.pool.Stop()
}

func StartHttpPool(maxWorkers int) *HttpPool {
	pool := &HttpPool{
		pool: threadpool.NewWorkerPool(maxWorkers, maxWorkers*2),
	}

	pool.pool.Start()

	return pool
}
