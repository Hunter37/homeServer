package swim

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"hash/fnv"
	"io"
	"net/http"
	"time"

	"homeServer/utils"
)

type httpCacheItem struct {
	header http.Header
	body   []byte
}

var (
	httpCache             = utils.NewTTLCache[string, httpCacheItem](512 * 1024 * 1024) // 512MB
	httpCacheItemOverhead = 8
)

const (
	TTL = 24 * time.Hour
)

type ErrorResponse struct {
	Error bool `json:"error"`
}

func QueryHandler(writer http.ResponseWriter, req *http.Request) {
	if req != nil && req.Body != nil {
		defer req.Body.Close()
	}

	utils.LogHttpCaller(req, true)

	url := req.URL.Query().Get("url")
	bodyBytes, err := io.ReadAll(req.Body)
	if err != nil {
		http.Error(writer, "Failed to read request body", http.StatusBadRequest)
		return
	}

	hash := fnv.New64a()
	hash.Write([]byte(url))
	hash.Write(bodyBytes)
	key := string(hash.Sum(nil))

	item, err := httpCache.GetWithLoader(key, func(key string) (*httpCacheItem, int, time.Duration, error) {
		code, header, responseBody, err := forwardRequest(req.Method, url, req.Header, bodyBytes)
		if err != nil {
			return nil, 0, 0, fmt.Errorf("failed to forward request: %v", err)
		}

		if code != http.StatusOK {
			return nil, 0, 0, fmt.Errorf("response code: %d", code)
		}

		decodedBody := responseBody
		if header.Get("Content-Encoding") == "gzip" {
			decodedBody, err = gzipDecode(responseBody)
			if err != nil {
				return nil, 0, 0, fmt.Errorf("failed to decode gzip body: %v", err)
			}
		}

		var errResp ErrorResponse
		if err := json.Unmarshal(decodedBody, &errResp); err != nil {
			return nil, 0, 0, fmt.Errorf("failed to unmarshal response body: %v", err)
		}

		item := &httpCacheItem{body: responseBody, header: header}

		if errResp.Error {
			// don't cache error responses (ttl=0), but return them to the client (err=nil)
			return item, 0, 0, nil
		}

		header.Add("X-Cache-Date", time.Now().UTC().Format(time.RFC3339))
		return item, httpCacheItemOverhead + len(responseBody), TTL, nil //igonre header size
	})

	if err != nil {
		http.Error(writer, err.Error(), http.StatusNotFound)
		return
	}

	for key, values := range item.header {
		for _, value := range values {
			writer.Header().Add(key, value)
		}
	}

	writer.WriteHeader(http.StatusOK)
	writer.Write(item.body)
}

func gzipDecode(responseBody []byte) ([]byte, error) {
	gzipReader, err := gzip.NewReader(bytes.NewReader(responseBody))
	if err != nil {
		return nil, err
	}
	defer gzipReader.Close()

	return io.ReadAll(gzipReader)
}

func forwardRequest(method, url string, reqHeader http.Header, bodyBytes []byte) (int, http.Header, []byte, error) {
	req, err := http.NewRequest(method, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return http.StatusBadRequest, nil, nil, err
	}
	req.Header = reqHeader

	client := &http.Client{}
	resp, err := client.Do(req)
	if resp != nil && resp.Body != nil {
		defer resp.Body.Close()
	}
	if err != nil {
		return http.StatusInternalServerError, nil, nil, err
	}

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return http.StatusInternalServerError, nil, nil, err
	}

	return resp.StatusCode, resp.Header, responseBody, nil
}
