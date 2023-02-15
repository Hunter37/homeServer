package swim

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"homeServer/regex"
)

func generateRankTable(swimmer *Swimmer, url string) *Table {
	header := make([]string, 0, 12)
	header = append(header, "Course", "Stroke", "Dist", "Time", "Date", "Count")
	var longest *[]Ranking
	for _, ranks := range swimmer.Rankings {
		if longest == nil || len(*longest) < len(ranks.Ranks) {
			longest = &(ranks.Ranks)
		}
	}
	for _, rank := range *longest {
		header = append(header, rank.Level)
	}

	items := make([][]string, 0, len(swimmer.Rankings))
	for _, ranks := range swimmer.Rankings {
		event := swimmer.GetBestEvent(ranks.Course, ranks.Stroke, ranks.Length)
		item := make([]string, 0, 12)
		item = append(item, ranks.Course, ranks.Stroke, fmt.Sprint(ranks.Length),
			formatSwimTime(event.Time), event.Date.Format("1/02/06"),
			fmt.Sprint(len(swimmer.GetEvents(ranks.Course, ranks.Stroke, ranks.Length))))
		for i := 0; i < len(*longest); i++ {
			if i < len(ranks.Ranks) {
				item = append(item, fmt.Sprint(ranks.Ranks[i].Rank))
			} else {
				item = append(item, "")
			}
		}
		// add trClass and first url
		item = append(item, fmt.Sprintf("d%d %s", ranks.Length, ranks.Stroke), ranks.Url)
		for i := 0; i < len(*longest); i++ {
			if i < len(ranks.Ranks) {
				item = append(item, fmt.Sprint(ranks.Ranks[i].Link))
			} else {
				item = append(item, "")
			}
		}

		items = append(items, item)
	}

	combineRows(items, 0, "age")
	combineRows(items, 1, "hd")

	left, right := swimmer.GetBirthday()
	headerLen := len(header)
	return &Table{
		Header:  header,
		Items:   items,
		Value:   buildSequenceIntSlice(len(header)),
		Link:    []int{-1, -1, headerLen + 1, -1, -1, -1, headerLen + 2, headerLen + 3, headerLen + 4, headerLen + 5, headerLen + 6, headerLen + 7},
		TrClass: &headerLen,
		Action:  []string{"", "", ActionHref, "", "", "", ActionSearch, ActionSearch, ActionSearch, ActionSearch, ActionSearch, ActionSearch},
		Additions: []*Element{
			{Text: swimmer.Name, Link: url},
			{Text: swimmer.Gender},
			{Text: fmt.Sprint(swimmer.Age)},
			{Text: swimmer.Team},
			{Text: "Birthday: " + sprintBirthday(left, right)},
			{Text: fmt.Sprintf("Total Event: %d", swimmer.GetEventCount())},
		},
	}
}

func generateAgeBestTable(swimmer *Swimmer) *Table {
	ageMin := 100
	ageMax := 0

	// build maps
	eventName := make([]string, 0, 38)
	eventMap := make(map[string]bool, 38)
	eventAgeMap := make(map[string]*Event, 38*5)
	swimmer.ForEachEvent(func(course, stroke string, length int, event *Event) {
		if event.Age > ageMax {
			ageMax = event.Age
		} else if event.Age < ageMin {
			ageMin = event.Age
		}
		name := fmt.Sprintf("%s %s %d", course, stroke, length)
		if _, ok := eventMap[name]; !ok {
			eventMap[name] = true
			eventName = append(eventName, name)
		}
		name += fmt.Sprintf(" %d", event.Age)
		if e, ok := eventAgeMap[name]; !ok || e.Time > event.Time {
			eventAgeMap[name] = event
		}
	})

	header := make([]string, 0, ageMax-ageMin+1)
	header = append(header, `<th rowspan="2">Course</th>`, `<th rowspan="2">Stroke</th>`, `<th rowspan="2">Dist</th>`)
	for age := ageMax; age >= ageMin; age-- {
		header = append(header, fmt.Sprintf(`<th colspan="3">%d</th>`, age))
	}
	headerLen := (len(header) - 2) * 3

	subHeader := make([]string, 0, headerLen)
	subHeader = append(subHeader, ">", ">", ">")
	for i := 1; i < headerLen/3; i++ {
		subHeader = append(subHeader, "Time", "Std", "Date")
	}

	items := make([][]string, 0, len(eventName))
	items = append(items, subHeader)
	for _, event := range eventName {
		item := make([]string, 0, headerLen)
		parts := strings.Split(event, " ")
		item = append(item, parts...)
		for age := ageMax; age >= ageMin; age-- {
			key := fmt.Sprintf("%s %d", event, age)
			if e, found := eventAgeMap[key]; found {
				item = append(item, []string{formatSwimTime(e.Time), e.Standard, e.Date.Format("1/02/06")}...)
			} else {
				item = append(item, []string{"", "", ""}...)
			}
		}
		item = append(item, fmt.Sprint("d", parts[2], " ", parts[1]))
		items = append(items, item)
	}

	combineRows(items, 0, "age")
	combineRows(items, 1, "hd")

	return &Table{
		Header:  header,
		Value:   buildSequenceIntSlice(headerLen),
		TrClass: &headerLen,
		Items:   items,
		Title:   "Best Age Time",
	}
}

func generateEventsTable(swimmer *Swimmer, course string) *Table {
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

	// build maps
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
		d, _ := time.Parse("2006/01/02", date)
		row[1] = d.Format("1/02/06")
		var meet string
		var team string

		for _, ls := range lengthStrokes {
			dls := fmt.Sprint(date, " ", ls)
			if event, ok := dlsMap[dls]; ok {
				parts := strings.Split(ls, " ")
				delta := swimmer.GetDelta(course, parts[1], parseInt(parts[0]), event)
				class := "dp"
				if strings.Contains(delta, "+") {
					class = "ad"
				}
				row = append(row, fmt.Sprintf(`<td class="ct d%s"><div>%s</div><div class="std">%s</div><div class="dd %s">%s</div></td>`,
					strings.ToLower(ls), formatSwimTime(event.Time), event.Standard, class, delta))
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

	combineRows(items, 0, "age")

	return &Table{
		Header:    header,
		Items:     items,
		Value:     values,
		LeftAlign: lAligns,
		Title:     course + " Events",
	}
}

func generateTopListTable(urls []string) *Table {
	lists := data.TopLists
	title := ""
	subtitle := ""
	for _, url := range urls {
		list := lists[url]
		title += " " + list.Level
		if list.Title != subtitle {
			subtitle += list.Title
		}
	}

	isImxTable := len(lists[urls[0]].ImxTitle) > 0

	header := []string{"Name", "Time", "Date", "Age", "Birthday", "LSC", "Team", "Meet"}
	link := []int{8, -1, -1, -1, 9}
	action := []string{ActionSearch, "", "", "", ActionBirthday}
	lalign := []bool{true, false, false, false, true, true, true, true}
	filterCol := 8

	if isImxTable {
		header = make([]string, 0, 11)
		header = append(header, "Name", "Score")
		header = append(header, lists[urls[0]].ImxTitle...)
		header = append(header, "Age", "Birthday", "LSC", "Team")
		link = []int{11, -1, -1, -1, -1, -1, -1, -1, 12}
		action = []string{ActionSearch, "", "", "", "", "", "", "", ActionBirthday}
		lalign = []bool{true, false, false, false, false, false, false, false, true, true, true}
		filterCol = 11
	}

	maxAge := 0
	items := make([][]string, 0, 1000)
	for _, url := range urls {
		list := lists[url]
		for _, row := range list.List {
			bdayData := row.Url
			lsc := strings.ToUpper(regex.MatchOne(row.Url, `strokes_([^/]+)/`, 1))
			if swimmer := data.Swimmers.Find(row.Sid); swimmer != nil {
				left, right := swimmer.GetBirthday()
				setBrithday := struct {
					Link string
					Birthday
				}{
					Link: row.Url,
					Birthday: Birthday{
						Right:   right.Format("2006-01-02"),
						Display: sprintBirthday(left, right),
					},
				}
				b, _ := json.Marshal(setBrithday)
				bdayData = string(b)
			}

			if isImxTable {
				item := make([]string, 0, 12)
				item = append(item, row.Name, fmt.Sprint(*row.Score))
				item = append(item, convertToStringSlice(row.ImxScores)...)
				item = append(item, fmt.Sprint(row.Age), "Find out", lsc, row.Team, row.Url, bdayData)
				items = append(items, item)
			} else {
				items = append(items, []string{row.Name, formatSwimTime(*row.Time), row.Date.Format("1/02/06"),
					fmt.Sprint(row.Age), "Find out", lsc, row.Team, row.Meet, row.Url, bdayData})
			}

			if maxAge < row.Age {
				maxAge = row.Age
			}
		}
	}

	if isImxTable {
		sort.Slice(items, func(i, j int) bool {
			return parseSwimTime(items[i][1]) > parseSwimTime(items[j][1]) ||
				parseSwimTime(items[i][1]) == parseSwimTime(items[j][1]) && parseInt(items[i][7]) > parseInt(items[j][7])
		})
	} else {
		sort.Slice(items, func(i, j int) bool {
			return parseSwimTime(items[i][1]) < parseSwimTime(items[j][1]) ||
				parseSwimTime(items[i][1]) == parseSwimTime(items[j][1]) && parseInt(items[i][3]) < parseInt(items[j][3])
		})
	}

	return &Table{
		Title:        fmt.Sprintf("<h2>%s</h2><h3>%s</h3>", title, subtitle),
		Header:       header,
		Link:         link,
		Action:       action,
		LeftAlign:    lalign,
		Items:        items,
		ShowOrder:    true,
		FilterColumn: filterCol,
		Age:          maxAge,
		Additions:    buildAdditionMenus(urls),
	}
}

func buildAdditionMenus(urls []string) []*Element {
	elements := make([]*Element, 0, 30)
	textToElement := make(map[string]*Element, 30)
	for _, url := range urls {
		list := data.TopLists[url]
		for _, link := range list.Links {
			if e, ok := textToElement[link.Text]; ok {
				e.Link += "," + link.Url
			} else {
				e := &Element{Text: link.Text, Link: link.Url, Action: ActionSearch}
				textToElement[link.Text] = e
				elements = append(elements, e)
			}
		}
	}

	return elements
}

func convertToStringSlice[K any](input []K) []string {
	result := make([]string, 0, len(input))
	for _, t := range input {
		result = append(result, fmt.Sprint(t))
	}
	return result
}

func buildSequenceIntSlice(length int) []int {
	slice := make([]int, 0, length)
	for i := 0; i < length; i++ {
		slice = append(slice, i)
	}
	return slice
}

func combineRows(items [][]string, col int, tdClass string) {
	var lastRow []string
	lastValue := ""
	count := 1
	for i := len(items) - 1; i >= 0; i-- {
		row := items[i]
		if lastRow != nil && row[col] == lastValue {
			lastRow[col] = ">"
			count++
		} else {
			count = 1
		}

		lastValue = row[col]
		if row[col] != ">" {
			row[col] = fmt.Sprintf(`<td rowspan="%d" class="%s %s">%s</td>`, count, tdClass, strings.ToLower(row[col]), row[col])
		}
		lastRow = row
	}
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

func createErrorTable(text string) *Table {
	return &Table{
		Header: []string{"ERROR"},
		Value:  []int{0},
		Items:  [][]string{{text}},
	}
}
