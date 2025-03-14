package swim

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"hash/fnv"
	"io"
	"net/http"
	"strconv"
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
	Error json.RawMessage `json:"error"`
}

type HTTPError struct {
	Code   int
	Header http.Header
	Body   []byte
}

func (e *HTTPError) Error() string {
	return fmt.Sprintf("HTTP %d: %s", e.Code, e.Body)
}

func getLoader(url string, req *http.Request, bodyBytes []byte) utils.Loader[string, httpCacheItem] {
	return func(key string) (*httpCacheItem, int, error) {
		code, header, responseBody, err := forwardRequest(req.Method, url, req.Header, bodyBytes)
		if err != nil {
			return nil, -1, fmt.Errorf("failed to forward request: %v", err)
		}

		if code != http.StatusOK {
			return nil, -1, &HTTPError{Code: code, Header: header, Body: responseBody}
		}

		decodedBody := responseBody
		if header.Get("Content-Encoding") == "gzip" {
			decodedBody, err = gzipDecode(responseBody)
			if err != nil {
				return nil, -1, fmt.Errorf("failed to decode gzip body: %v", err)
			}
		}

		var errResp ErrorResponse
		if err := json.Unmarshal(decodedBody, &errResp); err != nil {
			return nil, -1, fmt.Errorf("failed to unmarshal response body: %v", err)
		}

		item := &httpCacheItem{body: responseBody, header: header}

		if errResp.Error != nil {
			// don't cache error responses (size<0), but return them to the client (err=nil)
			return item, -1, nil
		}

		header.Add("X-Cache-Date", time.Now().UTC().Format(time.RFC3339))
		return item, httpCacheItemOverhead + len(responseBody), nil //igonre header size
	}
}

func QueryHandler(writer http.ResponseWriter, req *http.Request) {
	if req != nil && req.Body != nil {
		defer req.Body.Close()
	}

	utils.LogHttpCaller(req, true)

	if req.Method == http.MethodOptions {
		writer.Header().Add("Access-Control-Allow-Methods", "POST")
		writer.Header().Add("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Cache-TTL")
		writer.Header().Add("Access-Control-Max-Age", "86400")
		writer.Header().Add("Access-Control-Allow-Origin", "null")
		writer.WriteHeader(http.StatusNoContent)
		return
	}

	url := req.URL.Query().Get("url")
	bodyBytes, err := io.ReadAll(req.Body)
	if err != nil {
		http.Error(writer, "Failed to read request body", http.StatusBadRequest)
		return
	}

	hash := fnv.New64a()
	hash.Write([]byte(req.Method))
	hash.Write([]byte(url))
	hash.Write(bodyBytes)
	key := string(hash.Sum(nil))

	var ttl time.Duration
	if ttlInSecond, err := strconv.Atoi(req.Header.Get("X-Cache-TTL")); err != nil {
		ttl = TTL
	} else {
		ttl = time.Duration(ttlInSecond) * time.Second
	}
	req.Header.Del("X-Cache-TTL")

	item, exp, err := httpCache.GetWithLoader(key, ttl, getLoader(url, req, bodyBytes))

	if err != nil {
		if err, ok := err.(*HTTPError); ok {
			for key, values := range err.Header {
				for _, value := range values {
					writer.Header().Add(key, value)
				}
			}
			writer.WriteHeader(err.Code)
			writer.Write([]byte(err.Body))
		} else {
			http.Error(writer, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	for key, values := range item.header {
		for _, value := range values {
			writer.Header().Add(key, value)
		}
	}
	writer.Header().Add("X-Cache-Exp", exp.UTC().Format(time.RFC3339))
	writer.Header().Set("Access-Control-Allow-Origin", "*")

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

	// req.Header.Del("Host")
	req.Header.Set("Origin", "https://data.usaswimming.org")
	
	client := &http.Client{
		Timeout: time.Second * 60,
	}
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
