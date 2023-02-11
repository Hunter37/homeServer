package http

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"homeServer/utils"

	"github.com/patrickmn/go-cache"
)

var (
	hc        = http.Client{Timeout: time.Minute}
	httpCache = cache.New(12*time.Hour, 24*time.Hour)
)

func HttpPost(url, content string) (string, error) {
	cacheKey := url + ":" + content
	if data, found := httpCache.Get(cacheKey); found {
		return data.(string), nil
	}

	body, err := httpPost(url, content)
	if err == nil {
		httpCache.Set(cacheKey, body, 0)
	}

	return body, err
}

func HttpCache() *cache.Cache {
	return httpCache
}

func httpPost(url, body string) (string, error) {
	if strings.Contains(url, ";") {
		utils.LogError(fmt.Errorf("bad url: %v", url))
	}

	contextType := "application/x-www-form-urlencoded"
	resp, err := hc.Post(url, contextType, bytes.NewBuffer([]byte(body)))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return "", errors.New(fmt.Sprintf("ERROR: %d %s %s", resp.StatusCode, resp.Status, resp.Body))
	}
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func HttpGet(url string) (string, error) {
	if data, found := httpCache.Get(url); found {
		return data.(string), nil
	}
	body, err := retryHttpGet(url)
	if err == nil {
		httpCache.Set(url, body, 0)
	}

	return body, err
}

func retryHttpGet(url string) (string, error) {
	var body string
	var err error
	for i := 0; i < 3; i++ {
		body, err = httpGet(url)
		if err == nil {
			break
		}
	}
	return body, err
}

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

	resp, err := hc.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return "", errors.New(fmt.Sprintf("ERROR: %d %s %s", resp.StatusCode, resp.Status, resp.Body))
	}
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func BatchGet(urls []string) []string {
	bodyChans := make([]chan string, 0, len(urls))
	for _, url := range urls {
		bodyChan := make(chan string)
		bodyChans = append(bodyChans, bodyChan)

		go func(url string, bodyChan chan<- string) {
			b, err := HttpGet(url)
			if err != nil {
				utils.LogError(err)
			}
			bodyChan <- b
		}(url, bodyChan)
	}

	result := make([]string, 0, len(urls))
	for _, bodyChan := range bodyChans {
		result = append(result, <-bodyChan)
	}

	return result
}

func CloseBody(resp *http.Response) {
	if resp != nil && resp.Body != nil {
		resp.Body.Close()
	}
}
