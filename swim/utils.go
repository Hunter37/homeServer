package swim

import (
	"fmt"
	"sort"
	"strings"
)

func formatSwimTime(t int) string {
	if t < 10000 {
		return fmt.Sprintf("%d.%02d", t/100, t%100)
	}
	return fmt.Sprintf("%d:%02d.%02d", t/10000, t/100%100, t%100)
}

func parseSwimTime(str string) int {
	str = strings.Replace(str, ":", "", 1)
	str = strings.Replace(str, ".", "", 1)
	return parseInt(str)
}

type Ordered interface {
	int | int8 | int16 | int32 | int64 |
		uint | uint8 | uint16 | uint32 | uint64 | uintptr |
		float32 | float64 |
		string
}

func sortedKeys[K Ordered, V any](m map[K]V, reverse ...bool) []K {
	keys := make([]K, len(m))
	i := 0
	for k := range m {
		keys[i] = k
		i++
	}
	if len(reverse) > 0 && reverse[0] {
		sort.Slice(keys, func(i, j int) bool { return keys[i] > keys[j] })
	} else {
		sort.Slice(keys, func(i, j int) bool { return keys[i] < keys[j] })
	}
	return keys
}

func reverse[K any](s []K) []K {
	for i, j := 0, len(s)-1; i < j; i, j = i+1, j-1 {
		s[i], s[j] = s[j], s[i]
	}
	return s
}
