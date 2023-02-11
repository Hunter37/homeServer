package swim

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"errors"
	"fmt"
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

type Birthday struct {
	Display string
	Right   string
}

type Table struct {
	Header       []string   // table header
	Value        []int      // index of the text value in items
	Link         []int      // index of the link in items
	Action       []string   // action of the link
	Items        [][]string // table data
	Additions    []*Element
	ShowOrder    bool
	LeftAlign    []bool
	FilterColumn int
	Age          int
	Title        string
	Next         *Table
}

type Element struct {
	Text   string
	Link   string
	Action string
}

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
	// todo: delete old
	body, err := HttpGet(link)
	if err != nil {
		utils.LogError(err)
		return time.Now(), time.Now()
	}

	getAllEventLinkAndPages(body)

	//_, bodies := getAllEventLinkAndPages(body)
	//eventDateAge := findEventDateAge(bodies)
	//leftOld, rightOld := findBirthdayOld(eventDateAge)

	// new
	sid := regex.MatchOne(link, "([^/]+)_meets.html", 1)
	return findBirthday(sid)
}

func findBirthday(id string) (time.Time, time.Time) {
	swimmer := data.Find(id)
	if swimmer != nil {
		return swimmer.GetBirthday()
	}
	return time.Now(), time.Now()
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
		return createError(err.Error())
	}

	body = removeHTMLSpace(body)
	body = removeFooter(body)

	_, items := findTable(body, []int{1, 2, 3}, func(row string) []string {
		return regex.MatchRow(row, `(https://www.swimmingrank.com/[^']+/strokes/strokes_([^']+)/[^']+_meets.html)`, []int{2, 1})
	})

	if len(items) == 0 {
		return createError("Cannot found " + name)
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

func createError(text string) *Table {
	return &Table{
		Header: []string{"ERROR"},
		Value:  []int{0},
		Items:  [][]string{{text}},
	}
}

func getInfo(text string) *Table {
	body, err := HttpGet(text)
	if err != nil {
		utils.LogError(err)
		return createError(err.Error())
	}

	name := regex.MatchOne(body, `<h1>([^<>]+)</h1>`, 1)
	ageTable := regex.FindInnerPart(body, `<th>Age</th>`, `</tr>`)
	age := regex.MatchOne(ageTable, `>([^<>]+)</`, 1)
	genderTable := regex.FindInnerPart(body, `<th>Sex</th>`, `</tr>`)
	gender := regex.MatchOne(genderTable, `>([^<>]+)</`, 1)
	teamTable := regex.FindInnerPart(body, `<th>Team</th>`, `</tr>`)
	team := regex.MatchOne(teamTable, `>([^<>]+)</`, 1)

	urls, bodies := getAllEventLinkAndPages(body)

	// old
	eventDateAge := findEventDateAge(bodies)
	//bdayLeft, bdayRight := findBirthdayOld(eventDateAge)

	// new
	sid := regex.MatchOne(text, "([^/]+)_meets.html", 1)
	swimmer := data.Find(sid)
	left, right := findBirthday(sid)

	// compare old and new
	//if bdayLeft != left || bdayRight != right {
	//	utils.LogError(errors.New(fmt.Sprint("findBirthday error", bdayLeft, left, bdayRight, right)))
	//}

	header := make([]string, 0)
	ranks := make([][]string, 0, len(bodies)*2)
	links := make([][]string, 0, len(bodies)*2)
	for urlIndex, body := range bodies {
		h, rank, link := getBestTime(body)
		h = utils.Remove(h, 1)
		h[1], h[2] = h[2], h[1]
		h = utils.Insert(h, 3, "Count")
		for i, subRank := range rank {
			cnt := count(eventDateAge, subRank[0])
			subRank = utils.Remove(subRank, 1)
			subRank[1], subRank[2] = subRank[2], subRank[1]
			subRank = utils.Insert(subRank, 3, fmt.Sprint(cnt))
			rank[i] = utils.Insert(subRank, 0, urls[urlIndex])
		}

		if len(h) > len(header) {
			header = h
		}

		ranks = append(ranks, rank...)
		links = append(links, link...)
	}

	// build value index (0 is the link, start from 1)
	value := make([]int, 0, len(header))
	for i := 0; i < len(header); i++ {
		value = append(value, i+1)
	}

	// append links
	for i, link := range links {
		rank := ranks[i]
		for j := len(rank); j <= len(header); j++ {
			rank = append(rank, "")
		}
		ranks[i] = append(rank, link...)
	}

	ageStdTable := generateAgeStdTable(sid)
	lastTable := ageStdTable

	// todo: remove this
	oldTable := getAgeStdTable(bodies)
	if compareTable(oldTable, ageStdTable) {
		oldTable = nil
	}

	lastTable.Next = generateDetailsTable(sid, "Yards")
	lastTable = lastTable.Next
	lastTable.Title = "SCY Events"

	lastTable.Next = generateDetailsTable(sid, "Meters")
	lastTable = lastTable.Next
	lastTable.Title = "LCM Events"

	lastTable.Next = oldTable

	return &Table{
		Header: header,
		Items:  append(filterTable(ranks, 1, " Yd "), filterTable(ranks, 1, " M ")...),
		Value:  value,
		Link:   []int{0, -1, -1, -1, len(header) + 1, len(header) + 2, len(header) + 3, len(header) + 4, len(header) + 5, len(header) + 6},
		Action: []string{ActionHref, "", "", "", ActionSearch, ActionSearch, ActionSearch, ActionSearch, ActionSearch, ActionSearch},
		Additions: []*Element{
			{Text: name, Link: text},
			{Text: gender},
			{Text: age},
			{Text: team},
			{Text: "Birthday: " + sprintBirthday(left, right)},
			{Text: fmt.Sprintf("Total Event: %d", swimmer.GetEventCount())},
		},
		Next: ageStdTable,
	}
}

func getDataFromPage(body string) {
	body = strings.Replace(body, "\n", "", -1)
	body = strings.Replace(body, "\r", "", -1)
	id := regex.MatchOne(body, `/strokes/[^/]+/([^/]+)_meets.html`, 1)
	name := regex.FindInnerPart(body, `<h1>`, `</h1>`)
	LscName := regex.MatchOne(body, `LSC</th>[^>]*>([^<]+)</td>`, 1)
	lscId := regex.MatchOne(body, `swimmingrank.com/([^/]+/[^/]+)/clubs.html`, 1)
	gender := regex.MatchOne(body, `Sex</th>[^>]*>([^<]+)</td>`, 1)
	team := regex.FindInnerPart(body, `.html'">`, "</button>")

	tables := regex.FindPartList(body, `<h3>`, `</table>`)
	for _, table := range tables {
		event := regex.FindInnerPart(table, `<h3>`, `</h3>`)
		parts := strings.SplitN(event, " ", 3)
		if len(parts) != 3 {
			utils.LogError(errors.New("wrong event name: [" + event + "]"))
			continue
		}
		course := "SCY"
		if strings.Contains(parts[1], "Meters") {
			course = "LCM"
		}
		length, err := strconv.Atoi(parts[0])
		utils.LogError(err)
		stroke := parts[2]

		_, rows := findTable(table, nil, nil)

		for _, row := range rows {
			date, _ := time.Parse("1/2/2006", row[0])

			if len(row) == 6 {
				row = utils.Insert(row, 4, "")
			}
			powerPoint := 0
			if len(row[4]) > 0 {
				powerPoint = parseInt(row[4])
			}
			dataEvent := &Event{
				Date:       date,
				Age:        parseInt(row[1]),
				Time:       parseSwimTime(row[2]),
				Standard:   row[3],
				PowerPoint: powerPoint,
				Team:       row[5],
				Meet:       row[6],
			}

			data.Add(lscId, LscName, id, name, gender, team, course, stroke, length, dataEvent)
		}
	}
}

func parseInt(str string) int {
	n, err := strconv.Atoi(str)
	utils.LogError(err)
	return n
}

func getAgeStdTable(bodies []string) *Table {
	events := make([]string, 0, 18*2)
	ageMin := 100
	ageMax := 0
	best := make(map[string][]string, 0)

	for _, body := range bodies {
		tables := regex.FindPartList(body, `<h3>`, `</table>`)
		for _, table := range tables {
			event := regex.FindInnerPart(table, `<h3>`, `</h3>`)
			events = append(events, event)
			_, rows := findTable(table, []int{1, 2, 3, 0}, nil)
			for _, row := range rows {
				age, err := strconv.Atoi(row[0])
				utils.LogError(err)
				if age > ageMax {
					ageMax = age
				}
				if age < ageMin {
					ageMin = age
				}
				key := event + row[0]
				data, found := best[key]
				if found {
					time := parseTime(data[1])
					newTime := parseTime(row[1])
					if newTime < time {
						found = false
					}
				}
				if !found {
					best[key] = row
				}
			}
		}
	}

	header := make([]string, 1, ageMax-ageMin+1)
	for age := ageMax; age >= ageMin; age-- {
		header = append(header, fmt.Sprintf(`<th colspan="3">%d</th>`, age))
	}

	value := make([]int, 0, 3*len(header)-2)
	for i := 0; i < 3*len(header)-2; i++ {
		value = append(value, i)
	}

	subHeader := make([]string, 0, 3*len(header)-2)
	subHeader = append(subHeader, `Event`)
	for i := 1; i < len(header); i++ {
		subHeader = append(subHeader, []string{`Time`, `Std`, `Date`}...)
	}

	items := make([][]string, 0, len(events))
	for _, event := range events {
		item := make([]string, 0, len(value))
		item = append(item, event)
		for age := ageMax; age >= ageMin; age-- {
			key := fmt.Sprintf("%v%d", event, age)
			if data, found := best[key]; found {
				item = append(item, data[1:]...)
			} else {
				item = append(item, []string{"", "", ""}...)
			}
		}
		items = append(items, compressRow(item))
	}

	return &Table{
		Header: header,
		Items:  append(append([][]string{subHeader}, filterTable(items, 0, " Yd ")...), filterTable(items, 0, " M ")...),
		Value:  value,
		Title:  "Best Age Time",
	}
}

func compareTable(t1, t2 *Table) bool {
	j1, _ := json.Marshal(t1)
	j2, _ := json.Marshal(t2)
	if !strings.EqualFold(string(j1), string(j2)) {
		utils.LogError(errors.New("different aga best time table<" + string(j1) + ">  <" + string(j2) + ">"))
		return false
	}
	return true
}

func generateAgeStdTable(id string) *Table {
	swimmer := data.Find(id)
	if swimmer == nil {
		utils.LogError(errors.New("wrong swimmer id: [" + id + "]"))
		return nil
	}

	ageMin := 100
	ageMax := 0
	eventName := make([]string, 0, 30)
	eventMap := make(map[string]bool, 30)
	eventAgeMap := make(map[string]*Event, 30*5)
	swimmer.ForEachEvent(func(course, stroke string, length int, event *Event) {
		if event.Age > ageMax {
			ageMax = event.Age
		} else if event.Age < ageMin {
			ageMin = event.Age
		}
		name := fmt.Sprintf("%d %s %s", length, course, stroke)
		if _, ok := eventMap[name]; !ok {
			eventMap[name] = true
			eventName = append(eventName, name)
		}
		name += fmt.Sprintf(" %d", event.Age)
		if e, ok := eventAgeMap[name]; !ok || e.Time > event.Time {
			eventAgeMap[name] = event
		}
	})

	header := make([]string, 1, ageMax-ageMin+1)
	for age := ageMax; age >= ageMin; age-- {
		header = append(header, fmt.Sprintf(`<th colspan="3">%d</th>`, age))
	}

	subHeader := make([]string, 0, 3*len(header)-2)
	subHeader = append(subHeader, `Event`)
	for i := 1; i < len(header); i++ {
		subHeader = append(subHeader, []string{`Time`, `Std`, `Date`}...)
	}

	value := make([]int, 0, 3*len(header)-2)
	for i := 0; i < 3*len(header)-2; i++ {
		value = append(value, i)
	}

	items := make([][]string, 0, len(eventName))
	items = append(items, subHeader)
	for _, event := range eventName {
		item := make([]string, 0, len(value))
		item = append(item, event)
		for age := ageMax; age >= ageMin; age-- {
			key := fmt.Sprintf("%s %d", event, age)
			if e, found := eventAgeMap[key]; found {
				item = append(item, []string{formatSwimTime(e.Time), e.Standard, e.Date.Format("1/02/06")}...)
			} else {
				item = append(item, []string{"", "", ""}...)
			}
		}
		items = append(items, compressRow(item))
	}

	return &Table{
		Header: header,
		Value:  value,
		Items:  items,
		Title:  "Best Age Time",
	}
}

func generateDetailsTable(id, course string) *Table {
	swimmer := data.Find(id)
	if swimmer == nil {
		utils.LogError(errors.New("wrong swimmer id: [" + id + "]"))
		return nil
	}

	// build map [date+stroke+length] -> event
	dlsMap := make(map[string]*Event, 300)
	header := make([]string, 2, 10)
	header[0] = `<th rowspan="2">Age</th>`
	header[1] = `<th rowspan="2">Date</th>`
	subHeader := make([]string, 2, 30)
	subHeader[0] = `>`
	subHeader[1] = `>`
	lAligns := make([]bool, 2, 30)
	preStroke := ""
	strokeMap := map[string]map[int]bool{
		Free:   map[int]bool{},
		Breast: map[int]bool{},
		Back:   map[int]bool{},
		Fly:    map[int]bool{},
		IM:     map[int]bool{},
	}
	dateMap := make(map[string]bool, 300)
	lenghtStrokeMap := make(map[string]bool, 24)
	lengthStrokes := make([]string, 0, 24)

	swimmer.ForEachEvent(func(c, s string, l int, event *Event) {
		if c == course {
			date := event.Date.Format("2006/01/02")
			dls := fmt.Sprint(date, " ", l, " ", s)
			if e, ok := dlsMap[dls]; !ok || e.Time > event.Time {
				dlsMap[dls] = event
			}

			lstr := fmt.Sprint(l)

			if s != preStroke {
				preStroke = s
				header = append(header, s)
				subHeader = append(subHeader, lstr)
				lAligns = append(lAligns, false)
			} else {
				if subHeader[len(subHeader)-1] != lstr {
					subHeader = append(subHeader, lstr)
					lAligns = append(lAligns, false)
				}
			}

			strokeMap[s][l] = true
			dateMap[date] = true

			ls := fmt.Sprint(l, " ", s)
			if _, ok := lenghtStrokeMap[ls]; !ok {
				lenghtStrokeMap[ls] = true
				lengthStrokes = append(lengthStrokes, ls)
			}
		}
	})

	header = append(header, `<th rowspan="2">Meet</th>`, `<th rowspan="2">Team</th>`)
	subHeader = append(subHeader, ">", ">")
	lAligns = append(lAligns, true, true)

	col := 4
	for i, h := range header {
		if m, ok := strokeMap[h]; ok {
			header[i] = fmt.Sprintf(`<th colspan="%d">%s</th>`, len(m), h)
			col += len(m)
		}
	}

	values := make([]int, col, col)
	for i := 0; i < col; i++ {
		values[i] = i
	}

	items := make([][]string, 0, 50)
	items = append(items, subHeader)
	for _, date := range sortedKeys(dateMap, true) {
		row := make([]string, 2, 24)
		row[1] = date
		var meet string
		var team string

		for _, ls := range lengthStrokes {
			dls := fmt.Sprint(date, " ", ls)
			if event, ok := dlsMap[dls]; ok {
				pp := ""
				if event.PowerPoint > 0 {
					pp = fmt.Sprint(event.PowerPoint)
				}
				row = append(row, fmt.Sprintf(`<td class="ct d%s"><div>%s</div><div class="std">%s</div><div class="pp">%s</div></td>`,
					strings.ToLower(ls), formatSwimTime(event.Time), event.Standard, pp))
				meet = event.Meet
				team = event.Team
				row[0] = fmt.Sprint(event.Age)
			} else {
				row = append(row, fmt.Sprintf(`<td class="d%s"></td>`, strings.ToLower(ls)))
			}
		}
		row = append(row, meet, team)

		items = append(items, row)
	}

	var lastRow []string
	lastValue := ""
	count := 1
	for i := len(items) - 1; i > 0; i-- {
		row := items[i]
		if lastRow != nil && row[0] == lastValue {
			lastRow[0] = ">"
			count++
		} else {
			count = 1
		}

		lastValue = row[0]
		row[0] = fmt.Sprintf(`<td rowspan="%d" class="age">%s</td>`, count, row[0])
		lastRow = row
	}

	return &Table{
		Header:    header,
		Items:     items,
		Value:     values,
		LeftAlign: lAligns,
	}
}

func compressRow(item []string) []string {
	for i, val := range item {
		val = strings.Replace(val, "Yards", "Yd", 1)
		val = strings.Replace(val, "Meters", "M", 1)
		val = strings.Replace(val, "style", "", 1)
		val = strings.Replace(val, "stroke", "", 1)
		val = strings.Replace(val, "stoke", "", 1)
		val = strings.Replace(val, "Butterfly", Fly, 1)
		val = strings.Replace(val, "Individual Medley", IM, 1)
		if t, err := time.Parse("1/2/2006", val); err == nil {
			val = t.Format("1/02/06")
		}
		item[i] = val
	}
	return item
}

func parseTime(data string) int {
	result, err := time.Parse("4:05.99", data)
	if err != nil {
		result, err = time.Parse("5.99", data)
	}
	utils.LogError(err)
	return (result.Minute()*60+result.Second())*100 + result.Nanosecond()/10000000
}

func filterTable(table [][]string, colIndex int, filter string) [][]string {
	newTable := make([][]string, 0, len(table))
	for _, row := range table {
		if strings.Contains(row[colIndex], filter) {
			newTable = append(newTable, row)
		}
	}
	return newTable
}

func getAllEventLinkAndPages(body string) ([]string, []string) {
	urls := getAllEventLinks(body)
	pages := BatchGet(urls)

	for _, body := range pages {
		// extract data
		getDataFromPage(body)
	}

	return urls, pages
}

func getAllEventLinks(body string) []string {
	events := regex.FindInnerPart(body, `<div id="event_menu">`, `</div>`)
	urls := regex.MatchColumn(events, `<a href="([^<>]+)">\d`, 1)
	return urls
}

func getBestTime(body string) ([]string, [][]string, [][]string) {
	table := regex.FindPart(body, `<h2>Rankings by Career Best</h2>`, `</table>`)

	links := make([][]string, 0)
	header, ranks := findTable(table, nil, func(row string) []string {
		link := regex.MatchColumn(row, `href='([^']+)'">`, 1)
		links = append(links, link)
		return []string{}
	})

	//table = regex.FindPart(body, `<h2>Current Season Rankings</h2>`, `</table>`)
	//_, standards := findTable(table, []int{0, 3, 4, 1}, nil)
	//eventTimeToStd := make(map[string]string, 0)
	//eventTimeToGroup := make(map[string]string, 0)
	//for _, std := range standards {
	//	key := std[0] + std[1]
	//	eventTimeToStd[key] = std[2]
	//	eventTimeToGroup[key] = std[3]
	//}
	//
	//for i, rank := range ranks {
	//	key := rank[0] + rank[3]
	//	if std, ok := eventTimeToStd[key]; ok {
	//		ranks[i] = utils.Insert(ranks[i], 1, std)
	//		ranks[i][2] = eventTimeToGroup[key]
	//	} else {
	//		ranks[i] = utils.Insert(ranks[i], 1, "")
	//	}
	//	//links[i] = utils.Insert(links[i], 1, "")
	//}
	//
	//header = utils.Insert(header, 1, "Std")

	return header, ranks, links
}

func findEventDateAge(pages []string) [][]string {
	eventDateAge := [][]string{}
	for _, body := range pages {
		eda := regex.MatchTable(body, `data.setValue\(\d+, \d+, '.+\\n(.+)\\n(\d+/\d+/\d+) \((\d+) yrs\)`, []int{1, 2, 3})
		eventDateAge = append(eventDateAge, eda...)
	}

	return eventDateAge
}

func timeMin(a, b time.Time) time.Time {
	if a.After(b) {
		return b
	}
	return a
}

func timeMax(a, b time.Time) time.Time {
	if a.After(b) {
		return a
	}
	return b
}

func sprintBirthday(left, right time.Time) string {
	rightPart := right.Format("2006/01/02")
	if left.Equal(right) {
		return rightPart
	}

	if left.Year() == right.Year() {
		rightPart = right.Format("01/02")
	}

	return fmt.Sprintf("%s - %s", left.Format("2006/01/02"), rightPart)
}

func count(list [][]string, first string) int {
	cnt := 0
	for _, item := range list {
		if strings.EqualFold(item[0], first) {
			cnt++
		}
	}
	return cnt
}

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

func findTable(body string, columns []int, addition func(row string) []string) ([]string, [][]string) {
	tables := regex.FindPartList(body, `<table`, "</table>")

	if columns == nil {
		number := strings.Count(tables[0], "<th")
		columns = make([]int, 0, number)
		for i := 0; i < number; i++ {
			columns = append(columns, i)
		}
	}

	hs := regex.FindPartList(tables[0], "<th>", "</th>")
	headers := getCellValues(hs, columns)

	body = strings.Join(tables, "")
	rows := regex.FindPartList(body, "<tr>", "</tr>")
	result := make([][]string, 0, len(rows))

	for _, row := range rows {
		cells := regex.FindPartList(row, "<td", "</td>")
		if len(cells) == 0 {
			continue
		}

		newRow := getCellValues(cells, columns)
		if addition != nil {
			newRow = append(newRow, addition(row)...)
		}

		result = append(result, newRow)
	}

	return headers, result
}

func getCellValues(cells []string, columns []int) []string {
	result := make([]string, 0, len(columns))
	for _, i := range columns {
		value := ""
		if i < len(cells) {
			value = regex.MatchOne(cells[i], `>([^<>]+)<`, 1)
		}
		result = append(result, strings.TrimSpace(value))
	}
	return result
}
