package utils

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"runtime"
	"time"
)

func Clone[T any](val T) T {
	if val2, err := deepClone(val); err != nil {
		LogError(err, "Deep clone failed", val)
		return val
	} else {
		return val2
	}
}

func deepClone[T any](val T) (T, error) {
	data, err := json.Marshal(val)
	if err != nil {
		return val, err
	}

	var result T
	err = json.Unmarshal(data, &result)
	return result, err
}

func LogError(err error, a ...any) {
	if err != nil {
		pc, filename, line, _ := runtime.Caller(1)
		CleanTempTime()
		fmt.Print(GetLogTime())
		fmt.Printf(" [\033[31mERROR\033[0m] in %s[%s:%d] %v", runtime.FuncForPC(pc).Name(), filename, line, err)
		fmt.Println(a...)
	}
}

func LogHttpCaller(req *http.Request, goodPath bool) {
	pathColor := 31 // red
	if goodPath {
		pathColor = 32 // green
	}
	CleanTempTime()
	fmt.Print(GetLogTime())
	host, _, err := net.SplitHostPort(req.RemoteAddr)
	if err != nil {
		host = req.RemoteAddr
	}
	fmt.Printf(" \033[33m%-15v\033[0m \033[2m[\033[36m%v\033[0m\033[2m]\033[0m\033[%dm%v \033[0m%v\n",
		host, req.Method, pathColor, req.URL.String(), req.Header["User-Agent"])
}

func Log(msg string) {
	CleanTempTime()
	fmt.Print(msg)
}

func GetLogTime() string {
	return time.Now().Format("[2006-01-02 15:04:05.000]")
}

func LogTempTime(optional ...any) {
	CleanTempTime()
	fmt.Print("\u001B[30m\u001B[47m")
	fmt.Print(GetLogTime())
	fmt.Print("\u001B[0m")
	if len(optional) > 0 {
		fmt.Print(optional...)
	}
	needNewLine = true
}

func CleanTempTime() {
	if needNewLine {
		needNewLine = false
		fmt.Print("\u001B[0G")
	}
}

// hack
var needNewLine = false
