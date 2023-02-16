package swim

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	. "homeServer/http"
	"homeServer/regex"
	"homeServer/utils"
)

const (
	ActionHref     = "href"
	ActionSearch   = "search"
	ActionBirthday = "birthday"

	Free   = "Free"
	Back   = "Back"
	Breast = "Breast"
	Fly    = "Fly"
	IM     = "IM"
)

var (
	LeftAlignCols = map[string]bool{"Swimmer": true, "Team": true, "Swim Meet": true, "Birthday": true, "Club": true}
)

var router = map[string]func(http.ResponseWriter, *http.Request){
	"/swim":          mainPageHandler,
	"/swim/settings": settingsPageHandler,
	"/swim/data":     dataPageHandler,
	"/swim/search":   searchHandler,
	"/swim/birthday": birthdayHandler,
	"/swim/cache":    cacheHandler,
	"/swim/swimmer":  swimmerHandler,
}

func SwimHandler(writer http.ResponseWriter, req *http.Request) {
	if handler, ok := router[req.URL.Path]; ok {
		utils.LogHttpCaller(req, true)
		handler(writer, req)
		return
	}

	utils.LogHttpCaller(req, false)
	gzipWrite(writer, nil, http.StatusNotFound)
}

func mainPageHandler(writer http.ResponseWriter, req *http.Request) {
	body, err := os.ReadFile("swim/swim.html")
	utils.LogError(err)

	writer.Header().Set("Content-Type", "text/html")
	gzipWrite(writer, body, http.StatusOK)
}

func settingsPageHandler(writer http.ResponseWriter, req *http.Request) {
	body, err := os.ReadFile("swim/settings.html")
	utils.LogError(err)

	writer.Header().Set("Content-Type", "text/html")
	gzipWrite(writer, body, http.StatusOK)
}

func dataPageHandler(writer http.ResponseWriter, req *http.Request) {
	body, err := json.Marshal(mainData)
	utils.LogError(err)
	if err == nil {
		err = mainData.Save()
		utils.LogError(err)
	}

	writer.Header().Set("Content-Type", "text/json")
	gzipWrite(writer, body, http.StatusOK)
}

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

func cacheHandler(writer http.ResponseWriter, req *http.Request) {
	httpCache := HttpCache()
	if req.URL.Query().Has("flush") {
		httpCache.Flush()
	}

	data := map[string]any{
		"action": "cache-flush",
		"items":  httpCache.ItemCount(),
		"time":   utils.GetLogTime(),
	}
	body, err := json.Marshal(data)
	if err != nil {
		utils.LogError(err)
		gzipWrite(writer, body, http.StatusNotFound)
	}

	writer.Header().Set("Content-Type", "text/json")
	gzipWrite(writer, body, http.StatusOK)
}

func swimmerHandler(writer http.ResponseWriter, req *http.Request) {
	id := req.URL.Query().Get("id")
	var sid string
	mainData.Find(id, true, func(swimmer *Swimmer, _ string) {
		if swimmer != nil {
			sid = swimmer.ID
		}
	})

	if len(sid) == 0 {
		gzipWrite(writer, []byte("Swimmer not found"), http.StatusNotFound)
		return
	}

	if req.Method == http.MethodPut {
		b, err := io.ReadAll(req.Body)
		if err != nil {
			gzipWrite(writer, []byte("Read request body failed"), http.StatusNotFound)
			return
		}

		var s Swimmer
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

		mainData.Find(sid, true, func(swimmer *Swimmer, _ string) {
			*swimmer = s
		})
		mainData.Save()
	}

	var body []byte
	mainData.Find(sid, false, func(swimmer *Swimmer, _ string) {
		body, _ = json.Marshal(swimmer)
	})

	writer.Header().Set("Content-Type", "text/json")
	gzipWrite(writer, body, http.StatusOK)
}

func gzipWrite(writer http.ResponseWriter, body []byte, statusCode int) {
	if len(body) <= 256 {
		writer.WriteHeader(statusCode)
		writer.Write(body)
		return
	}

	gzipWriter, err := gzip.NewWriterLevel(writer, gzip.BestCompression)
	if err != nil {
		utils.LogError(err)
		writer.WriteHeader(statusCode)
		writer.Write(body)
		return
	}
	defer gzipWriter.Close()

	writer.Header().Set("Content-Encoding", "gzip")
	writer.WriteHeader(statusCode)
	gzipWriter.Write(body)
}

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

func birthday(link string) (time.Time, time.Time) {
	sid, err := extractSwimmerAllData(link)
	if err != nil {
		utils.LogError(err)
		return time.Now(), time.Now()
	}

	var left time.Time
	var right time.Time
	mainData.Find(sid, false, func(swimmer *Swimmer, _ string) {
		left, right = swimmer.GetBirthday()
	})
	return left, right
}

func search(text string) *Table {
	text = strings.TrimSpace(text)
	if strings.Index(text, "https://") == 0 {
		if strings.Contains(text, `/strokes/`) {
			return getInfo(text)
		}
		return getRanks(text)
	}

	return getSearchResult(text)
}

func getSearchResult(name string) *Table {
	body, err := HttpPost("https://swimmingrank.com/cgi-bin/main_search.cgi",
		"searchstring="+url.QueryEscape(name))
	if err != nil {
		utils.LogError(err)
		return createErrorTable(err.Error())
	}

	body = removeHTMLSpace(removeFooter(body))

	_, items := findTable(body, []int{1, 2, 3}, func(row string) []string {
		return regex.MatchRow(row, `https://www.swimmingrank.com/[^/]+/strokes/strokes_([^/]+)/([^/]+)_meets.html`, []int{1, 2, 0})
	})

	return generateSearchTable(name, items)
}

func getInfo(url string) *Table {
	sid, err := extractSwimmerAllData(url)
	if err != nil {
		return createErrorTable(err.Error())
	}

	var mainTable *Table
	mainData.Find(sid, false, func(swimmer *Swimmer, _ string) {
		mainTable = generateRankTable(swimmer, url)
		lastTable := mainTable

		lastTable.Next = generateAgeBestTable(swimmer)
		lastTable = lastTable.Next

		lastTable.Next = generateEventsTable(swimmer, "SCY")
		lastTable = lastTable.Next

		lastTable.Next = generateEventsTable(swimmer, "LCM")
		lastTable = lastTable.Next
	})

	return mainTable
}

func getRanks(text string) *Table {
	urls := strings.Split(text, ",")
	extractTopListFromPage(urls)
	return generateTopListTable(urls)
}
