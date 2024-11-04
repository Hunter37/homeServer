package utils

import (
	"sync"
	"time"

	"golang.org/x/exp/constraints"
)

const (
	ttlCachedItemOverhead = 8
)

type ttlCacheItem[V any] struct {
	valueChan  chan *V
	expiration time.Time
}

type TTLCache[K constraints.Ordered, V any] struct {
	cache *LRUCache[K, ttlCacheItem[V]]
	lock  sync.Mutex
}

func NewTTLCache[K constraints.Ordered, V any](capacity int) *TTLCache[K, V] {
	return &TTLCache[K, V]{
		cache: NewLRUCache[K, ttlCacheItem[V]](capacity),
		lock:  sync.Mutex{},
	}
}

type Loader[K constraints.Ordered, V any] func(key K) (*V, int, time.Duration, error)

func (c *TTLCache[K, V]) GetWithLoader(key K, loader Loader[K, V]) (*V, error) {

	item, found := func() (ttlCacheItem[V], bool) {
		c.lock.Lock()
		defer c.lock.Unlock()

		if item, found := c.cache.Get(key); found {
			if time.Now().Before(item.expiration) {
				return item, true
			} else {
				close(item.valueChan)
			}
		}

		item := ttlCacheItem[V]{valueChan: make(chan *V, 1), expiration: time.Now().Add(time.Minute)}
		c.cache.Put(key, item, ttlCachedItemOverhead)
		return item, false
	}()

	if found {
		val := <-item.valueChan
		item.valueChan <- val
		return val, nil
	}

	value, size, ttl, err := loader(key)
	if err != nil {
		c.cache.Remove(key)
		close(item.valueChan)
		return nil, err
	}

	item = ttlCacheItem[V]{valueChan: item.valueChan, expiration: time.Now().Add(ttl)}
	item.valueChan <- value

	// if ttl is zero, don't cache the value, but return it to the client
	if ttl > 0 {
		c.cache.Put(key, item, size+ttlCachedItemOverhead)
	} else {
		c.cache.Remove(key)
	}

	return value, nil
}

/*
// Get retrieves a value from the cache by its key.
// key: the key associated with the value.
// Returns the value and a boolean indicating if the value was found and is not expired.
func (c *TTLCache[K, V]) Get(key K) (*V, bool) {
	item, found := c.cache.Get(key)
	if !found {
		var zero V
		return &zero, false
	}
	val := <-item.valueChan
	item.valueChan <- val
	return val, time.Now().Before(item.expiration)
}

// Put adds a value to the cache with a specified time-to-live (TTL).
// key: the key associated with the value.
// value: the value to be stored in the cache.
// size: the size of the value in bytes.
// ttl: the duration for which the value should remain in the cache.
func (c *TTLCache[K, V]) Put(key K, value *V, size int, ttl time.Duration) {
	item := TTLCacheItem[V]{valueChan: make(chan *V, 1), expiration: time.Now().Add(ttl)}
	item.valueChan <- value
	c.cache.Put(key, item, size+cachedItemOverhead)
}
//*/
