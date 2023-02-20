package utils

import (
	"fmt"
	"testing"
)

func TestColor(t *testing.T) {
	for i := 0; i < 110; i++ {
		if i%10 == 0 {
			fmt.Println()
		}
		fmt.Printf("\033[%dm%4d\033[0m  ", i, i)
	}
}

func TestChannel(t *testing.T) {
	ch := make(chan int, 2)

	enqueue := func(v int) bool {
		select {
		case ch <- v:
			return true
		default:
			return false
		}
	}

	for i := 0; i < 3; i++ {
		fmt.Println(enqueue(i))
	}
}
