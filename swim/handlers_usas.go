package swim

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"hash/fnv"
	"io"
	"net/http"
	"time"

	"homeServer/utils"
)

type CacheItem struct {
	header http.Header
	body   []byte
}

type ErrorResponse struct {
	Error bool `json:"error"`
}

var (
	cache = utils.NewTTLCache[string, CacheItem](512 * 1024 * 1024) // 512MB
)

const (
	TTL = 24 * time.Hour
)

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

	item, found := cache.Get(key)
	if !found {
		code, header, responseBody := forwardRequest(req.Method, url, req.Header, bodyBytes, writer)
		if code != http.StatusOK {
			return
		}

		decodedBody := responseBody
		if header.Get("Content-Encoding") == "gzip" {
			decodedBody, err = gzipDecode(responseBody)
			if err != nil {
				http.Error(writer, "Failed to decode response gzip body", http.StatusInternalServerError)
				return
			}
		}

		var errResp ErrorResponse
		if err := json.Unmarshal(decodedBody, &errResp); err != nil {
			http.Error(writer, "Failed to unmarshal response body", http.StatusUnprocessableEntity)
			return
		}

		item = CacheItem{body: responseBody, header: header}

		if !errResp.Error {
			header.Add("X-Cache-Date", time.Now().UTC().Format(time.RFC3339))
			cache.Put(key, item, 8+len(responseBody), TTL) //igonre header size
		}
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

func forwardRequest(method, url string, reqHeader http.Header, bodyBytes []byte, writer http.ResponseWriter) (int, http.Header, []byte) {
	req, err := http.NewRequest(method, url, bytes.NewReader(bodyBytes))
	if err != nil {
		http.Error(writer, "Failed to create request", http.StatusBadRequest)
		return http.StatusBadRequest, nil, nil
	}
	req.Header = reqHeader

	client := &http.Client{}
	resp, err := client.Do(req)
	if resp != nil && resp.Body != nil {
		defer resp.Body.Close()
	}
	if err != nil {
		http.Error(writer, "Failed to send request", http.StatusInternalServerError)
		return http.StatusInternalServerError, nil, nil
	}

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(writer, "Failed to read response body", http.StatusInternalServerError)
		return http.StatusInternalServerError, nil, nil
	}

	return resp.StatusCode, resp.Header, responseBody
}
