package model

import (
	"fmt"
	"strconv"
	"strings"

	"homeServer/utils"
)

func FormatSwimTime(t int) string {
	if t < 10000 {
		return fmt.Sprintf("%d.%02d", t/100, t%100)
	}
	return fmt.Sprintf("%d:%02d.%02d", t/10000, t/100%100, t%100)
}

func ParseSwimTime(str string) int {
	str = strings.Replace(str, ":", "", 1)
	str = strings.Replace(str, ".", "", 1)
	return ParseInt(str)
}

func ParseInt(str string) int {
	n, err := strconv.Atoi(str)
	utils.LogError(err)
	return n
}
