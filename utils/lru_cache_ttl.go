package utils

import (
	"time"

	"golang.org/x/exp/constraints"
)

type TTLCacheItem[V any] struct {
	expiration time.Time
	value      V
}

type TTLCache[K constraints.Ordered, V any] struct {
	cache *LRUCache[K, TTLCacheItem[V]]
}

func NewTTLCache[K constraints.Ordered, V any](capacity int) *TTLCache[K, V] {
	return &TTLCache[K, V]{cache: NewLRUCache[K, TTLCacheItem[V]](capacity)}
}

// Get retrieves a value from the cache by its key.
// key: the key associated with the value.
// Returns the value and a boolean indicating if the value was found and is not expired.
func (c *TTLCache[K, V]) Get(key K) (V, bool) {
	item, found := c.cache.Get(key)
	if !found {
		var zero V
		return zero, false
	}
	return item.value, time.Now().Before(item.expiration)
}

// Put adds a value to the cache with a specified time-to-live (TTL).
// key: the key associated with the value.
// value: the value to be stored in the cache.
// size: the size of the value in bytes.
// ttl: the duration for which the value should remain in the cache.
func (c *TTLCache[K, V]) Put(key K, value V, size int, ttl time.Duration) {
	c.cache.Put(key, TTLCacheItem[V]{expiration: time.Now().Add(ttl), value: value}, size+8)
}
