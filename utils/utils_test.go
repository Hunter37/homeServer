package utils

import (
	"fmt"
	"testing"
)

func TestColor(t *testing.T) {
	t.Parallel()

	for i := 0; i < 256; i++ {
		if i%10 == 0 {
			fmt.Println()
		}
		fmt.Printf("\033[%dm%4d\033[0m  ", i, i)
	}
}
