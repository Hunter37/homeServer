package utils

import (
	"fmt"
	"reflect"
	"testing"

	"homeServer/test"
)

func TestForNilSlice(t *testing.T) {
	var nilSlice []string
	for _, s := range nilSlice {
		fmt.Println(s)
	}
}

func TestColor(t *testing.T) {
	for i := 0; i < 110; i++ {
		if i%10 == 0 {
			fmt.Println()
		}
		fmt.Printf("\033[%dm%4d\033[0m  ", i, i)
	}
	fmt.Println()
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

type testStruct struct {
	IntVal    int
	IntPtr    *int
	StrVal    string
	StrPtr    *string
	SlcVal    []int
	SlcPtr    *[]*int
	Recursive *testStruct
}

func TestDeepClone(t *testing.T) {
	int2 := 2
	str4 := "4"
	int6 := 6
	test1 := &testStruct{
		IntVal: 1,
		IntPtr: &int2,
		StrVal: "3",
		StrPtr: &str4,
		SlcVal: []int{5},
		SlcPtr: &[]*int{&int6},
		Recursive: &testStruct{
			IntVal: 7,
		},
	}

	test2, err := deepClone(test1)
	test.NoError(t, err)
	test.Equal(t, test1, test2)

	test3, err := deepClone(test1)
	test.NoError(t, err)
	test.Equal(t, test1, test3)

	test1.IntVal += 100
	int2 += 100
	test1.StrVal += "100"
	str4 += "100"
	test1.SlcVal[0] += 100
	int6 += 100
	test1.Recursive.IntVal += 100

	test.NotEqual(t, test1, test2)
	test.NotEqual(t, test1, test3)
	test.Equal(t, test2, test3)
}

func TestDeepCloneWithNil(t *testing.T) {
	var p *int

	cp, err := deepClone(p)
	test.NoError(t, err)
	test.Equal(t, p, cp)

	arr := make([]*int, 0)
	carr, err := deepClone(arr)
	test.NoError(t, err)
	test.True(t, reflect.DeepEqual(carr, arr))

	arr = append(arr, nil)
	carr2, err := deepClone(arr)
	test.NoError(t, err)
	test.True(t, reflect.DeepEqual(carr2, arr))
}
