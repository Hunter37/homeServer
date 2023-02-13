package swim

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"sort"
	"strconv"
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
	body, err := json.Marshal(data)
	utils.LogError(err)
	if err == nil {
		err = data.Save()
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
	swimmer := data.Find(id)
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

		if swimmer.ID != s.ID {
			gzipWrite(writer, []byte("Swimmer id is wrong"), http.StatusNotFound)
			return
		}

		*swimmer = s
		data.Save()
	}

	body, _ := json.Marshal(swimmer)

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
	swimmer, err := extractSwimmerAllData(link)
	if err != nil {
		utils.LogError(err)
		return time.Now(), time.Now()
	}

	return swimmer.GetBirthday()
}

func search(text string) *Table {
	text = strings.TrimSpace(text)
	if strings.Index(text, "https://") == 0 {
		if strings.Contains(text, `/strokes/`) {
			return getInfo(text)
		}
		return getRanks(text)
	} else if strings.Index(text, "d:") == 0 {
		return getDataInfo(text)
	}

	return getSearchResult(text)
}

func getDataInfo(text string) *Table {
	return nil
}

func getSearchResult(name string) *Table {
	body, err := HttpPost("https://swimmingrank.com/cgi-bin/main_search.cgi",
		"searchstring="+url.QueryEscape(name))
	if err != nil {
		utils.LogError(err)
		return createErrorTable(err.Error())
	}

	body = removeHTMLSpace(body)
	body = removeFooter(body)

	_, items := findTable(body, []int{1, 2, 3}, func(row string) []string {
		return regex.MatchRow(row, `(https://www.swimmingrank.com/[^']+/strokes/strokes_([^']+)/[^']+_meets.html)`, []int{2, 1})
	})

	if len(items) == 0 {
		return createErrorTable("Cannot found " + name)
	}
	filterdItems := make([][]string, 0, len(items))
	for _, row := range items {
		if strings.EqualFold(row[0], name) {
			filterdItems = append(filterdItems, row)
		}
	}

	if len(filterdItems) == 0 {
		filterdItems = items
	}

	if len(filterdItems) == 1 {
		return getInfo(filterdItems[0][4])
	}

	for _, row := range filterdItems {
		row[3] = strings.ToUpper(row[3])
	}

	return &Table{
		Header:    []string{},
		Value:     []int{0, 1, 2, 3},
		Link:      []int{4},
		Action:    []string{ActionSearch},
		Items:     filterdItems,
		ShowOrder: true,
		LeftAlign: []bool{true, false, true},
	}
}

func createErrorTable(text string) *Table {
	return &Table{
		Header: []string{"ERROR"},
		Value:  []int{0},
		Items:  [][]string{{text}},
	}
}

func getInfo(url string) *Table {
	swimmer, err := extractSwimmerAllData(url)
	if err != nil {
		return createErrorTable(err.Error())
	}

	rankingTable := generateRankTable(swimmer, url)
	lastTable := rankingTable

	lastTable.Next = generateAgeBestTable(swimmer)
	lastTable = lastTable.Next

	lastTable.Next = generateEventsTable(swimmer, "Yards")
	lastTable = lastTable.Next
	lastTable.Title = "SCY Events"

	lastTable.Next = generateEventsTable(swimmer, "Meters")
	lastTable = lastTable.Next
	lastTable.Title = "LCM Events"

	return rankingTable
}

// parsing.....

func removeHTMLSpace(body string) string {
	return regexp.MustCompile(`>\s+<`).ReplaceAllString(body, "><")
}

func getRanks(text string) *Table {
	urls := strings.Split(text, ",")
	pages := BatchGet(urls)

	title := ""
	for i, page := range pages {
		pages[i] = removeFooter(removeHTMLSpace(page))
		title += regex.FindPart(pages[i], "<h1>", "</h1>")
	}

	subtitle := regex.FindPart(pages[0], "<h2>", "</h2>")
	for _, page := range pages {
		st := regex.FindPart(page, "<h2>", "</h2>")
		if st != subtitle {
			utils.LogError(errors.New("different subtitle: [" + subtitle + "][" + st + "]"))
		}
	}
	title += subtitle

	subtitle = regex.FindPart(pages[0], "<h3>", "</h3>")
	for _, page := range pages {
		st := regex.FindPart(page, "<h3>", "</h3>")
		if st != subtitle {
			utils.LogError(errors.New("different subtitle: [" + subtitle + "][" + st + "]"))
		}
	}
	title += subtitle

	valueColumns := []int{1, 2, 3, 4, 5, 6}
	link := []int{7, -1, -1, -1, -1, -1, 8}
	action := []string{ActionSearch, "", "", "", "", "", ActionBirthday}
	filterCol := 7
	if strings.Contains(title, IM) {
		valueColumns = []int{1, 2, 3, 4, 5, 6, 7, 8, 9}
		link = []int{10, -1, -1, -1, -1, -1, -1, -1, -1, 11}
		action = []string{ActionSearch, "", "", "", "", "", "", "", "", ActionBirthday}
		filterCol = 10
	}

	var header []string
	var items [][]string
	additions := make([]*Element, 0, 32)
	name2AddMap := make(map[string]*Element, 32)

	for _, page := range pages {
		var rows [][]string
		header, rows = findTable(page, valueColumns, func(row string) []string {
			m := regex.MatchRow(row, `(https://www.swimmingrank.com/[^/]+/strokes/strokes_[a-z]+/)[^A-Z]*([A-Z0-9_]+)_[0-9a-zA-Z]+.html`, []int{1, 2})
			if len(m) == 0 {
				return []string{}
			}
			sid := m[1]
			link := m[0] + m[1] + "_meets.html"
			bdayData := link

			if swimmer := data.Find(sid); swimmer != nil {
				left, right := swimmer.GetBirthday()
				setBrithday := struct {
					Link string
					Birthday
				}{
					Link: link,
					Birthday: Birthday{
						Right:   right.Format("2006-01-02"),
						Display: sprintBirthday(left, right),
					},
				}
				b, _ := json.Marshal(setBrithday)
				bdayData = string(b)
			}

			return []string{"Find out", link, bdayData}
		})
		items = append(items, rows...)

		ad := getAdditionMenus(page, "event_menu")
		for _, a := range ad {
			if e, ok := name2AddMap[a.Text]; !ok {
				additions = append(additions, a)
				name2AddMap[a.Text] = a
			} else {
				e.Link += "," + a.Link
			}
		}
	}

	if len(pages) == 1 {
		additions = append(additions, getAdditionMenus(pages[0], "imx_menu")...)
	}

	if len(items) > 0 && len(items[0]) == 6 {
		sort.Slice(items, func(i, j int) bool {
			return parseSwimTime(items[i][3]) < parseSwimTime(items[j][3])
		})
	}

	maxAge := 0
	for _, row := range items {
		age, err := strconv.Atoi(row[1])
		utils.LogError(err)
		if age > maxAge {
			maxAge = age
		}
	}

	header = append(header, "Birthday")
	align := make([]bool, 0, len(header))
	for _, head := range header {
		if _, ok := LeftAlignCols[head]; ok {
			align = append(align, true)
		} else {
			align = append(align, false)
		}
	}

	return &Table{
		Header:       header,
		Items:        items,
		Link:         link,
		Action:       action,
		LeftAlign:    align,
		ShowOrder:    true,
		FilterColumn: filterCol,
		Age:          maxAge,
		Title:        title,
		Additions:    additions,
	}
}

func removeFooter(body string) string {
	if index := strings.LastIndex(body, `<table border="0"`); index > 0 {
		body = body[:index]
	}
	return body
}

func findMenu(body, id string) ([]string, []string) {
	body = regex.FindInnerPart(body, `<div id="`+id+`"`, "</div>")
	list := regex.FindPartList(body, "<a ", "/a>")
	text := make([]string, 0, len(list))
	link := make([]string, 0, len(list))
	for _, item := range list {
		text = append(text, regex.FindInnerPart(item, `>`, `<`))
		link = append(link, regex.FindInnerPart(item, `"`, `"`))
	}
	return text, link
}

func getAdditionMenus(body, id string) []*Element {
	var additions []*Element
	text, link := findMenu(body, id)
	for i, t := range text {
		additions = append(additions, &Element{Text: t, Link: link[i], Action: ActionSearch})
	}
	return additions
}
