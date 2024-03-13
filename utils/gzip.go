package utils

import (
	"compress/gzip"
	"net/http"
)

func GzipWrite(writer http.ResponseWriter, body []byte, statusCode int) {
	if len(body) <= 256 {
		writer.WriteHeader(statusCode)
		if _, err := writer.Write(body); err != nil {
			LogError(err)
		}
		return
	}

	gzipWriter, err := gzip.NewWriterLevel(writer, gzip.BestCompression)
	if err != nil {
		LogError(err)
		writer.WriteHeader(statusCode)
		if _, err := writer.Write(body); err != nil {
			LogError(err)
		}
		return
	}
	defer gzipWriter.Close()

	writer.Header().Set("Content-Encoding", "gzip")
	writer.WriteHeader(statusCode)
	if _, err := gzipWriter.Write(body); err != nil {
		LogError(err)
	}
}
