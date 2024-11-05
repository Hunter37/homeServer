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

type Loader[K constraints.Ordered, V any] func(key K) (*V, int, error)

func (c *TTLCache[K, V]) GetWithLoader(key K, ttl time.Duration, loader Loader[K, V]) (*V, time.Time, error) {

	item, found := func() (ttlCacheItem[V], bool) {
		c.lock.Lock()
		defer c.lock.Unlock()

		if item, found := c.cache.Get(key); found {
			// ttl < 0, will force the item get expired
			if time.Now().Before(item.expiration) && ttl >= 0 {
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
		return val, item.expiration, nil
	}

	if ttl < 0 {
		ttl = -ttl
	}

	value, size, err := loader(key)
	if err != nil {
		c.cache.Remove(key)
		close(item.valueChan)
		return nil, time.Time{}, err
	}

	item = ttlCacheItem[V]{valueChan: item.valueChan, expiration: time.Now().Add(ttl)}
	item.valueChan <- value

	// if size (cache item size) is negative, don't cache the value, but return it to the client
	if size < 0 {
		c.cache.Remove(key)
	} else {
		c.cache.Put(key, item, size+ttlCachedItemOverhead)
	}

	return value, item.expiration, nil
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
	item := ttlCacheItem[V]{valueChan: make(chan *V, 1), expiration: time.Now().Add(ttl)}
	item.valueChan <- value
	c.cache.Put(key, item, size+ttlCachedItemOverhead)
}
//*/
