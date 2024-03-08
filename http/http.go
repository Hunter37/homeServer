package http

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"homeServer/utils"
)

var (
	hc = http.Client{Timeout: time.Minute}
)

func HttpPost(url, body string) (string, error) {
	if strings.Contains(url, ";") {
		utils.LogError(fmt.Errorf("bad url: %v", url))
	}

	contextType := "application/x-www-form-urlencoded"
	resp, err := hc.Post(url, contextType, bytes.NewBuffer([]byte(body)))
	defer CloseBody(resp)
	if err != nil {
		return "", err
	}
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("ERROR: %d %s %s", resp.StatusCode, resp.Status, resp.Body)
	}
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

//func HttpGet(url string) (string, error) {
//	var body string
//	var err error
//	for i := 0; i < 3; i++ {
//		body, err = httpGet(url)
//		if err == nil {
//			break
//		}
//	}
//	return body, err
//}

func Retry(do func() (*http.Response, error), times int, backoff time.Duration) (*http.Response, error) {
	var resp *http.Response
	var err error
	for i := 0; i < times; i++ {
		if i != 0 {
			time.Sleep(backoff)
		}
		resp, err = do()
		if err == nil {
			break
		}
	}
	return resp, err
}

func httpGet(url string) (string, error) {
	if strings.Contains(url, ";") {
		utils.LogError(fmt.Errorf("bad url: %v", url))
	}

	if url == "" {
		return "", fmt.Errorf("empty url")
	}

	resp, err := hc.Get(url)
	defer CloseBody(resp)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("ERROR: %d %s %s", resp.StatusCode, resp.Status, resp.Body)
	}
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

//func BatchGet(urls []string) []string {
//	bodyChans := make([]chan string, 0, len(urls))
//	for _, url := range urls {
//		bodyChan := make(chan string)
//		bodyChans = append(bodyChans, bodyChan)
//
//		go func(url string, bodyChan chan<- string) {
//			b, err := HttpGet(url)
//			if err != nil {
//				utils.LogError(err)
//			}
//			bodyChan <- b
//		}(url, bodyChan)
//	}
//
//	result := make([]string, 0, len(urls))
//	for _, bodyChan := range bodyChans {
//		result = append(result, <-bodyChan)
//	}
//
//	return result
//}

func CloseBody(resp *http.Response) {
	if resp != nil && resp.Body != nil {
		resp.Body.Close()
	}
}
