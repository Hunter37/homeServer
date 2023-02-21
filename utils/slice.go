package utils

import "sort"

type Ordered interface {
	int | int8 | int16 | int32 | int64 |
		uint | uint8 | uint16 | uint32 | uint64 | uintptr |
		float32 | float64 |
		string
}

func SortedKeys[K Ordered, V any](m map[K]V, reverse ...bool) []K {
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

func Convert[K any, M any](s []K, c func(v K) M) []M {
	result := make([]M, 0, len(s))
	for _, v := range s {
		result = append(result, c(v))
	}
	return result
}

func ConvertWithIndex[K any, M any](s []K, c func(i int, v K) M) []M {
	result := make([]M, 0, len(s))
	for i, v := range s {
		result = append(result, c(i, v))
	}
	return result
}

func ToAnySlice[K any](input []K) []any {
	return Convert(input, func(v K) any { return v })
}

func Reverse[K any](s []K) []K {
	for i, j := 0, len(s)-1; i < j; i, j = i+1, j-1 {
		s[i], s[j] = s[j], s[i]
	}
	return s
}

func Insert[K any](list []K, index int, value K) []K {
	if len(list) == index {
		return append(list, value)
	}

	list = append(list[:index+1], list[index:]...)
	list[index] = value
	return list
}

func Remove(slice []string, s int) []string {
	return append(slice[:s], slice[s+1:]...)
}
