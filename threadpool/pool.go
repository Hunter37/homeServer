package threadpool

import (
	"sync"
	"sync/atomic"
	"time"
)

type Pool struct {
	singleJob         chan Work
	internalQueue     chan Work
	readyPool         chan chan Work //boss says hey i have a new job at my desk workers who available can get it in this way he does not have to ask current status of workers
	workers           []*worker
	dispatcherStopped sync.WaitGroup
	workersStopped    *sync.WaitGroup
	quit              chan bool

	runningWorkers int32
}

func NewWorkerPool(maxWorkers int, jobQueueCapacity int) *Pool {
	if maxWorkers <= 0 {
		maxWorkers = 1
	}

	if jobQueueCapacity < maxWorkers {
		jobQueueCapacity = 10 * maxWorkers
	}

	workersStopped := sync.WaitGroup{}

	readyPool := make(chan chan Work, maxWorkers)
	workers := make([]*worker, maxWorkers)

	// create workers
	for i := 0; i < maxWorkers; i++ {
		workers[i] = NewWorker(i, readyPool, &workersStopped)
	}

	pool := &Pool{
		internalQueue:     make(chan Work, jobQueueCapacity),
		singleJob:         make(chan Work),
		readyPool:         readyPool,
		workers:           workers,
		dispatcherStopped: sync.WaitGroup{},
		workersStopped:    &workersStopped,
		quit:              make(chan bool),
		runningWorkers:    int32(0),
	}

	for _, worker := range workers {
		worker.pool = pool
	}

	return pool
}

func (p *Pool) RunningWorkerCount() int {
	return int(atomic.LoadInt32(&p.runningWorkers))
}

func (p *Pool) RunningWorker(delta int) {
	atomic.AddInt32(&p.runningWorkers, int32(delta))
}

func (q *Pool) Start() {
	//tell workers to get ready
	for i := 0; i < len(q.workers); i++ {
		q.workers[i].Start()
	}
	// open factory
	go q.dispatch()
}

func (q *Pool) Stop() {
	q.quit <- true
	q.dispatcherStopped.Wait()
}

func (q *Pool) dispatch() {
	//open factory gate
	q.dispatcherStopped.Add(1)
	for {
		select {
		case job := <-q.singleJob:
			workerXChannel := <-q.readyPool //free worker x founded
			workerXChannel <- job           // here is your job worker x
		case job := <-q.internalQueue:
			workerXChannel := <-q.readyPool //free worker x founded
			workerXChannel <- job           // here is your job worker x
		case <-q.quit:
			// free all workers
			for i := 0; i < len(q.workers); i++ {
				q.workers[i].Stop()
			}
			// wait for all workers to finish their job
			q.workersStopped.Wait()
			//close factory gate
			q.dispatcherStopped.Done()
			return
		}
	}
}

/*This is blocking if all workers are busy*/
func (q *Pool) Submit(job Work) {
	// daily - fill the board with new works
	q.singleJob <- job
}

/*Tries to enqueue but fails if queue is full*/
func (q *Pool) Enqueue(job Work) bool {
	select {
	case q.internalQueue <- job:
		return true
	default:
		return false
	}
}

/*try to enqueue but fails if timeout occurs*/
func (q *Pool) EnqueueWithTimeout(job Work, timeout time.Duration) bool {
	if timeout <= 0 {
		timeout = 1 * time.Second
	}

	ch := make(chan bool, 1)
	t := time.AfterFunc(timeout, func() {
		ch <- false
	})
	defer func() {
		t.Stop()
	}()

	select {
	case q.internalQueue <- job:
		return true
	case <-ch:
		return false
	}
}
