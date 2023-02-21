package utils

import (
	"fmt"
	"strconv"
	"strings"
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
	LogError(err)
	return n
}

func CalculateSwimTimeDelta(a, b int) string {
	a = a/10000*6000 + a%10000
	b = b/10000*6000 + b%10000
	d := a - b
	sign := "+"
	if d == 0 {
		return "0"
	} else if d < 0 {
		sign = "-"
		d = -d
	}
	d = d/6000*10000 + d%6000
	return fmt.Sprint(sign, FormatSwimTime(d))
}

func GetSwimTimeInCentiSecond(time int) int {
	return time/10000*6000 + time%10000
}
