package swim

import (
	"io"
	"net/http"

	"homeServer/utils"
)

// SwimHandler the swim root handler
func QueryHandler(writer http.ResponseWriter, req *http.Request) {
	if req != nil && req.Body != nil {
		defer req.Body.Close()
	}

	utils.LogHttpCaller(req, true)

	url := req.URL.Query().Get("url")

	// var requestBody map[string]interface{}
	// if err := json.NewDecoder(req.Body).Decode(&requestBody); err != nil {
	// 	http.Error(writer, "Failed to decode request body", http.StatusBadRequest)
	// 	return
	// }

	// requestBodyBytes, err := json.Marshal(requestBody)
	// if err != nil {
	// 	http.Error(writer, "Failed to serialize request body", http.StatusInternalServerError)
	// 	return
	// }
	// body := bytes.NewReader(requestBodyBytes)

	// newReq, err := http.NewRequest(req.Method, url, body)
	newReq, err := http.NewRequest(req.Method, url, req.Body)
	if err != nil {
		http.Error(writer, "Failed to create POST request", http.StatusInternalServerError)
		return
	}
	newReq.Header = req.Header

	client := &http.Client{}
	resp, err := client.Do(newReq)
	if resp != nil && resp.Body != nil {
		defer resp.Body.Close()
	}

	if err != nil {
		http.Error(writer, "Failed to send POST request", http.StatusInternalServerError)
		return
	}

	for key, values := range resp.Header {
		for _, value := range values {
			writer.Header().Add(key, value)
		}
	}
	writer.WriteHeader(resp.StatusCode)
	if _, err := io.Copy(writer, resp.Body); err != nil {
		http.Error(writer, "Failed to copy response body", http.StatusInternalServerError)
	}

	// responseBody, err := io.ReadAll(resp.Body)
	// if err != nil {
	// 	http.Error(writer, "Failed to read response body", http.StatusInternalServerError)
	// 	return
	// }

	// for key, values := range resp.Header {
	// 	for _, value := range values {
	// 		writer.Header().Add(key, value)
	// 	}
	// }

	//utils.GzipWrite(writer, responseBody, resp.StatusCode)
}
