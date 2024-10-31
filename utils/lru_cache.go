package utils

import (
	"container/list"
	"sync"

	"golang.org/x/exp/constraints"
)

type CacheItem[K constraints.Ordered, V any] struct { // over head item * 3 * 8
	key   K
	value V
	size  int64
}

type LRUCache[K constraints.Ordered, V any] struct {
	size     int64
	capacity int64
	cache    map[K]*list.Element // over head item * 2 * 8	?
	list     *list.List          // over head item * 3 * 8
	mu       sync.Mutex
}

func NewLRUCache[K constraints.Ordered, V any](capacity int64) *LRUCache[K, V] {
	return &LRUCache[K, V]{
		size:     0,
		capacity: capacity,
		cache:    make(map[K]*list.Element),
		list:     list.New(),
	}
}

func (c *LRUCache[K, V]) Get(key K) (V, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if elem, found := c.cache[key]; found {
		c.list.MoveToFront(elem)
		return elem.Value.(*CacheItem[K, V]).value, true
	}
	var zero V
	return zero, false
}

func (c *LRUCache[K, V]) Put(key K, value V, size int64) {
	c.mu.Lock()
	defer c.mu.Unlock()

	elem, found := c.cache[key]
	if found {
		c.list.MoveToFront(elem)
		item := elem.Value.(*CacheItem[K, V])
		item.value = value
		c.size -= item.size
		c.size += size
		item.size = size
		return
	}

	newItem := &CacheItem[K, V]{key: key, value: value, size: size}
	newElem := c.list.PushFront(newItem)
	c.cache[key] = newElem
	c.size += size

	for c.size+int64(c.list.Len())*64 > c.capacity {
		backElem := c.list.Back()
		if backElem != nil {
			c.list.Remove(backElem)
			item := backElem.Value.(*CacheItem[K, V])
			c.size -= item.size
			delete(c.cache, item.key)
		}
	}
}
