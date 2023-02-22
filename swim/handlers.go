package swim

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"io"
	"net/http"
	"os"

	"homeServer/swim/model"
	"homeServer/utils"
)

var router = map[string]func(http.ResponseWriter, *http.Request){
	"/swim":          mainPageHandler,
	"/swim/settings": settingsPageHandler,
	"/swim/search":   searchHandler,
	"/swim/birthday": birthdayHandler,
	"/swim/mode":     modeHandler,
	"/swim/swimmer":  swimmerHandler,
}

// SwimHandler the swim root handler
func SwimHandler(writer http.ResponseWriter, req *http.Request) {
	if handler, ok := router[req.URL.Path]; ok {
		utils.LogHttpCaller(req, true)
		handler(writer, req)
		return
	}

	utils.LogHttpCaller(req, false)
	gzipWrite(writer, nil, http.StatusNotFound)
}

// mainPageHandler handle the main html page
func mainPageHandler(writer http.ResponseWriter, req *http.Request) {
	body, err := os.ReadFile("swim/html/swim.html")
	utils.LogError(err)

	writer.Header().Set("Content-Type", "text/html")
	gzipWrite(writer, body, http.StatusOK)
}

// settingsPageHandler handle the settings html page
func settingsPageHandler(writer http.ResponseWriter, req *http.Request) {
	body, err := os.ReadFile("swim/html/settings.html")
	utils.LogError(err)

	writer.Header().Set("Content-Type", "text/html")
	gzipWrite(writer, body, http.StatusOK)
}

// searchHandler handle the main input json query in main page
func searchHandler(writer http.ResponseWriter, req *http.Request) {
	query := req.URL.Query()
	term := query["input"][0]
	table := search(term)

	body, err := json.Marshal(table)
	if err != nil {
		utils.LogError(err)
	}

	writer.Header().Set("Content-Type", "text/json")
	gzipWrite(writer, body, http.StatusOK)
}

// birthdayHandler handle the birthday json query in the top list page
func birthdayHandler(writer http.ResponseWriter, req *http.Request) {
	utils.LogHttpCaller(req, true)
	query := req.URL.Query()
	link := query["link"][0]

	left, right := birthday(link)

	body, err := json.Marshal(Birthday{
		Display: sprintBirthday(left, right),
		Right:   right.Format("2006-01-02"),
	})
	if err != nil {
		utils.LogError(err)
	}

	writer.Header().Set("Content-Type", "text/json")
	gzipWrite(writer, body, http.StatusOK)
}

// modeHandler handle the search mode json query in the settings page
func modeHandler(writer http.ResponseWriter, request *http.Request) {
	val := request.URL.Query().Get("mode")
	if len(val) > 0 {
		settings := model.GetSettings()
		settings.SearchMode = model.ModeType(val)
		model.SetSettings(settings)
	}

	data := map[string]any{
		"mode": model.GetSettings().SearchMode,
	}
	body, _ := json.Marshal(data)

	writer.Header().Set("Content-Type", "text/json")
	gzipWrite(writer, body, http.StatusOK)
}

// swimmerHandler handle the swimmer view and update json request in settings page
func swimmerHandler(writer http.ResponseWriter, req *http.Request) {
	sid := req.URL.Query().Get("id")
	var body []byte
	swimmer, _ := model.Find(sid)
	if swimmer == nil {
		gzipWrite(writer, []byte("Swimmer not found"), http.StatusNotFound)
		return
	}

	if req.Method == http.MethodPut {
		b, err := io.ReadAll(req.Body)
		if err != nil {
			gzipWrite(writer, []byte("Read request body failed"), http.StatusNotFound)
			return
		}

		var s model.Swimmer
		if err = json.Unmarshal(b, &s); err != nil {
			gzipWrite(writer, []byte("Request body is not json object"), http.StatusNotFound)
			return
		}

		text, _ := json.Marshal(&s)
		text = bytes.Replace(text, []byte(`\u003c`), []byte("<"), -1)
		text = bytes.Replace(text, []byte(`\u003e`), []byte(">"), -1)
		text = bytes.Replace(text, []byte(`\u0026`), []byte("&"), -1)
		if len(text) != len(b) {
			gzipWrite(writer, []byte("Request json schema is wrong"), http.StatusNotFound)
			return
		}

		if sid != s.ID {
			gzipWrite(writer, []byte("Swimmer id is wrong"), http.StatusNotFound)
			return
		}

		model.UpdateSwimmer(sid, &s)
		model.Save()
	}

	body, _ = json.Marshal(swimmer)

	writer.Header().Set("Content-Type", "text/json")
	gzipWrite(writer, body, http.StatusOK)
}

func gzipWrite(writer http.ResponseWriter, body []byte, statusCode int) {
	if len(body) <= 256 {
		writer.WriteHeader(statusCode)
		if _, err := writer.Write(body); err != nil {
			utils.LogError(err)
		}
		return
	}

	gzipWriter, err := gzip.NewWriterLevel(writer, gzip.BestCompression)
	if err != nil {
		utils.LogError(err)
		writer.WriteHeader(statusCode)
		if _, err := writer.Write(body); err != nil {
			utils.LogError(err)
		}
		return
	}
	defer gzipWriter.Close()

	writer.Header().Set("Content-Encoding", "gzip")
	writer.WriteHeader(statusCode)
	if _, err := gzipWriter.Write(body); err != nil {
		utils.LogError(err)
	}
}
