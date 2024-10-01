package swim

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"homeServer/storage"
	"homeServer/swim/model"
	"homeServer/utils"
)

var router = map[string]func(http.ResponseWriter, *http.Request){
	"/swim":                 mainPageHandler,
	"/swim1":                main1PageHandler,
	"/swim1/settings":       settingsPageHandler,
	"/swim1/search":         searchHandler,
	"/swim1/birthday":       birthdayHandler,
	"/swim1/updateSettings": settingsHandler,
	"/swim1/mergeSwimmer":   mergeSwimmerHandler,
	"/swim1/swimmer":        swimmerHandler,
}

// SwimHandler the swim root handler
func SwimHandler(writer http.ResponseWriter, req *http.Request) {
	if handler, ok := router[req.URL.Path]; ok {
		utils.LogHttpCaller(req, true)
		handler(writer, req)
		return
	}

	utils.LogHttpCaller(req, false)
	utils.GzipWrite(writer, nil, http.StatusNotFound)
}

// mainPageHandler handle the main html page
func mainPageHandler(writer http.ResponseWriter, req *http.Request) {
	body, err := storage.File.Read("swim/html/swim.html")
	utils.LogError(err)

	writer.Header().Set("Content-Type", "text/html")
	utils.GzipWrite(writer, body, http.StatusOK)
}

// mainPageHandler handle the main html page
func main1PageHandler(writer http.ResponseWriter, req *http.Request) {
	body, err := storage.File.Read("swim/html/swim1.html")
	utils.LogError(err)

	writer.Header().Set("Content-Type", "text/html")
	utils.GzipWrite(writer, body, http.StatusOK)
}

// settingsPageHandler handle the settings html page
func settingsPageHandler(writer http.ResponseWriter, req *http.Request) {
	body, err := storage.File.Read("swim/html/settings.html")
	utils.LogError(err)

	writer.Header().Set("Content-Type", "text/html")
	utils.GzipWrite(writer, body, http.StatusOK)
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
	utils.GzipWrite(writer, body, http.StatusOK)
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
	utils.GzipWrite(writer, body, http.StatusOK)
}

// settingsHandler handle the read/write settings query in the settings page
func settingsHandler(writer http.ResponseWriter, request *http.Request) {
	val := request.URL.Query().Get("save")
	if len(val) > 0 {
		var settings model.Settings
		if err := json.Unmarshal([]byte(val), &settings); err == nil {
			model.SetSettings(&settings)
		} else {
			utils.LogError(fmt.Errorf("bad settings: %s", val))
		}
	}

	body, _ := json.Marshal(model.GetSettings())

	writer.Header().Set("Content-Type", "text/json")
	utils.GzipWrite(writer, body, http.StatusOK)
}

// mergeSwimmerHandler merge to swimmer data in the settings page
func mergeSwimmerHandler(writer http.ResponseWriter, request *http.Request) {
	from := request.URL.Query().Get("from")
	to := request.URL.Query().Get("to")
	if from == to {
		utils.GzipWrite(writer, []byte("self copy"), http.StatusBadRequest)
		return
	}

	if to == "DELETE" {
		err := model.RemoveSwimmerFromCache(from)
		if err != nil {
			utils.GzipWrite(writer, []byte(err.Error()), http.StatusBadRequest)
			return
		}
	} else {
		f := model.GetSwimmerFormCache(from)
		if f == nil {
			utils.GzipWrite(writer, []byte("cannot found swimmer 'From'"), http.StatusBadRequest)
			return
		}
		t := model.GetSwimmerFormCache(to)
		if t == nil {
			utils.GzipWrite(writer, []byte("cannot found swimmer 'To'"), http.StatusBadRequest)
			return
		}
		if f.Name != t.Name {
			utils.GzipWrite(writer, []byte("different name"), http.StatusBadRequest)
			return
		}

		f.ForEachEvent(func(course, stroke string, length int, event *model.Event) {
			t.AddEvent(course, stroke, length, event)
		})

		if t.Birthday == nil {
			t.Birthday = f.Birthday
		}
		if t.Middle == "" {
			t.Middle = f.Middle
		}
		if t.Alias == "" {
			t.Alias = f.Alias
		}

		err := model.WriteSwimmerToCache(t)
		if err != nil {
			utils.GzipWrite(writer, []byte(err.Error()), http.StatusBadRequest)
			return
		}
	}

	utils.GzipWrite(writer, nil, http.StatusOK)
}

// swimmerHandler handle the swimmer view and update json request in settings page
func swimmerHandler(writer http.ResponseWriter, req *http.Request) {
	fullId := req.URL.Query().Get("id")
	swimmer := model.GetSwimmerFormCache(fullId)
	if swimmer == nil {
		utils.GzipWrite(writer, []byte("Swimmer not found"), http.StatusNotFound)
		return
	}

	if req.Method == http.MethodPut {
		b, err := io.ReadAll(req.Body)
		if err != nil {
			utils.GzipWrite(writer, []byte("Read request body failed"), http.StatusNotFound)
			return
		}

		var s model.Swimmer
		if err = json.Unmarshal(b, &s); err != nil {
			utils.GzipWrite(writer, []byte("Request body is not json object"), http.StatusNotFound)
			return
		}

		text, _ := json.Marshal(&s)
		text = bytes.Replace(text, []byte(`\u003c`), []byte("<"), -1)
		text = bytes.Replace(text, []byte(`\u003e`), []byte(">"), -1)
		text = bytes.Replace(text, []byte(`\u0026`), []byte("&"), -1)
		if len(text) != len(b) {
			utils.GzipWrite(writer, []byte("Request json schema is wrong"), http.StatusNotFound)
			return
		}

		if swimmer.ID != s.ID {
			utils.GzipWrite(writer, []byte("Swimmer id is wrong"), http.StatusNotFound)
			return
		}

		err = model.WriteSwimmerToCache(&s)
		if err != nil {
			utils.GzipWrite(writer, []byte(err.Error()), http.StatusBadRequest)
			return
		}
	}

	body, _ := json.Marshal(swimmer)

	writer.Header().Set("Content-Type", "text/json")
	utils.GzipWrite(writer, body, http.StatusOK)
}
