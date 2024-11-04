package utils

import (
	"container/list"
	"sync"

	"golang.org/x/exp/constraints"
)

type lruCacheItem[K constraints.Ordered, V any] struct { // over head item * 3 * 8
	key   K
	value V
	size  int
}

const (
	lruCacheItemOverhead = 3*8 + 3*8
)

type LRUCache[K constraints.Ordered, V any] struct {
	size     int
	capacity int
	cache    map[K]*list.Element // over head item * 3 * 8	?
	list     *list.List          // over head item * 3 * 8
	lock     sync.Mutex
}

func NewLRUCache[K constraints.Ordered, V any](capacity int) *LRUCache[K, V] {
	return &LRUCache[K, V]{
		size:     0,
		capacity: capacity,
		cache:    make(map[K]*list.Element),
		list:     list.New(),
	}
}

func (c *LRUCache[K, V]) Get(key K) (V, bool) {
	c.lock.Lock()
	defer c.lock.Unlock()

	if elem, found := c.cache[key]; found {
		c.list.MoveToFront(elem)
		return elem.Value.(*lruCacheItem[K, V]).value, true
	}
	var zero V
	return zero, false
}

func (c *LRUCache[K, V]) Put(key K, value V, size int) {
	c.lock.Lock()
	defer c.lock.Unlock()

	if elem, found := c.cache[key]; found {
		c.list.MoveToFront(elem)
		item := elem.Value.(*lruCacheItem[K, V])
		item.value = value
		c.size -= item.size
		c.size += size
		item.size = size
		return
	}

	item := &lruCacheItem[K, V]{key: key, value: value, size: size}
	elem := c.list.PushFront(item)
	c.cache[key] = elem
	c.size += size

	for c.size+c.list.Len()*lruCacheItemOverhead > c.capacity {
		if elem := c.list.Back(); elem != nil {
			c.removeElement(elem)
		}
	}
}

func (c *LRUCache[K, V]) removeElement(elem *list.Element) {
	item := elem.Value.(*lruCacheItem[K, V])
	c.size -= item.size
	c.list.Remove(elem)
	delete(c.cache, item.key)
}

func (c *LRUCache[K, V]) Remove(key K) {
	c.lock.Lock()
	defer c.lock.Unlock()

	if elem, found := c.cache[key]; found {
		c.removeElement(elem)
	}
}
