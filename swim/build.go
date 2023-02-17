package swim

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"homeServer/regex"
	"homeServer/swim/model"
	"homeServer/utils"
)

func generateRankTable(swimmer *model.Swimmer, url string) *Table {
	header := make([]string, 0, 12)
	header = append(header, "Course", "Stroke", "Dist", "Time", "Date", "Count")
	var longest *[]model.Ranking
	for _, ranks := range swimmer.Rankings {
		if longest == nil || len(*longest) < len(ranks.Ranks) {
			longest = &(ranks.Ranks)
		}
	}
	for _, rank := range *longest {
		header = append(header, rank.Level)
	}

	items := make([][]any, 0, len(swimmer.Rankings))
	for _, ranks := range swimmer.Rankings {
		event := swimmer.GetBestEvent(ranks.Course, ranks.Stroke, ranks.Length)
		item := make([]any, 0, 12)
		item = append(item, ranks.Course, ranks.Stroke, ranks.Length,
			model.FormatSwimTime(event.Time), event.Date.Format("1/02/06"),
			len(swimmer.GetEvents(ranks.Course, ranks.Stroke, ranks.Length)))
		for i := 0; i < len(*longest); i++ {
			if i < len(ranks.Ranks) {
				item = append(item, ranks.Ranks[i].Rank)
			} else {
				item = append(item, "")
			}
		}
		// add trClass and first url
		item = append(item, fmt.Sprintf("d%d %s", ranks.Length, ranks.Stroke), ranks.Url)
		for i := 0; i < len(*longest); i++ {
			if i < len(ranks.Ranks) {
				item = append(item, ranks.Ranks[i].Link)
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
			{Log: fmt.Sprintf("%s (%s)     Alias:%s     ID=%s", swimmer.Name, swimmer.Middle, swimmer.Alias, swimmer.ID)},
		},
	}
}

func generateAgeBestTable(swimmer *model.Swimmer) *Table {
	ageMin := 100
	ageMax := 0

	// build maps
	eventName := make([]string, 0, 38)
	eventMap := make(map[string]bool, 38)
	eventAgeMap := make(map[string]*model.Event, 38*5)
	swimmer.ForEachEvent(func(course, stroke string, length int, event *model.Event) {
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

	subHeader := make([]any, 0, headerLen)
	subHeader = append(subHeader, ">", ">", ">")
	for i := 1; i < headerLen/3; i++ {
		subHeader = append(subHeader, "Time", "Std", "Date")
	}

	items := make([][]any, 0, len(eventName))
	items = append(items, subHeader)
	for _, event := range eventName {
		item := make([]any, 0, headerLen)
		parts := strings.Split(event, " ")
		item = append(item, ToAnySlice(parts)...)
		for age := ageMax; age >= ageMin; age-- {
			key := fmt.Sprintf("%s %d", event, age)
			if e, found := eventAgeMap[key]; found {
				item = append(item, []any{model.FormatSwimTime(e.Time), e.Standard, e.Date.Format("1/02/06")}...)
			} else {
				item = append(item, []any{"", "", ""}...)
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

func generateEventsTable(swimmer *model.Swimmer, course string) *Table {
	// build map [date+stroke+length] -> event
	dlsMap := make(map[string]*model.Event, 300)
	header := make([]string, 2, 10)
	header[0] = `<th rowspan="2">Age</th>`
	header[1] = `<th rowspan="2">Date</th>`
	subHeader := make([]any, 2, 30)
	subHeader[0] = `>`
	subHeader[1] = `>`
	lAligns := make([]bool, 2, 30)
	preStroke := ""
	strokeMap := map[string]map[int]bool{
		model.Free:   map[int]bool{},
		model.Breast: map[int]bool{},
		model.Back:   map[int]bool{},
		model.Fly:    map[int]bool{},
		model.IM:     map[int]bool{},
	}
	dateMap := make(map[string]bool, 300)
	lenghtStrokeMap := make(map[string]bool, 24)
	lengthStrokes := make([]string, 0, 24)

	// build maps
	swimmer.ForEachEvent(func(c, s string, l int, event *model.Event) {
		if c == course {
			date := event.Date.Format("2006/01/02")
			dls := fmt.Sprint(date, " ", l, " ", s)
			if e, ok := dlsMap[dls]; !ok || e.Time > event.Time {
				dlsMap[dls] = event
			}

			if s != preStroke {
				preStroke = s
				header = append(header, s)
				subHeader = append(subHeader, l)
				lAligns = append(lAligns, false)
			} else {
				if subHeader[len(subHeader)-1] != l {
					subHeader = append(subHeader, l)
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

	values := make([]int, col)
	for i := 0; i < col; i++ {
		values[i] = i
	}

	items := make([][]any, 0, 50)
	items = append(items, subHeader)
	for _, date := range utils.SortedKeys(dateMap, true) {
		row := make([]any, 2, 24)
		d, _ := time.Parse("2006/01/02", date)
		row[1] = d.Format("1/02/06")
		var meet string
		var team string

		for _, ls := range lengthStrokes {
			dls := fmt.Sprint(date, " ", ls)
			if event, ok := dlsMap[dls]; ok {
				parts := strings.Split(ls, " ")
				delta := swimmer.GetDelta(course, parts[1], model.ParseInt(parts[0]), event)
				class := "dp"
				if strings.Contains(delta, "+") {
					class = "ad"
				}
				row = append(row, fmt.Sprintf(`<td class="ct d%s"><div>%s</div><div class="std">%s</div><div class="dd %s">%s</div></td>`,
					strings.ToLower(ls), model.FormatSwimTime(event.Time), event.Standard, class, delta))
				meet = event.Meet
				team = event.Team
				row[0] = event.Age
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
	header := []string{"Name", "Time", "Date", "Age", "Birthday", "LSC", "Team", "Meet"}
	link := []int{8, -1, -1, -1, 9}
	action := []string{ActionSearch, "", "", "", ActionBirthday}
	lalign := []bool{true, false, false, false, true, true, true, true}
	filterCol := 8
	isImxTable := false
	items := make([][]any, 0, 1000)
	title := ""
	subtitle := ""
	maxAge := 0
	elements := make([]*Element, 0, 30)
	textToElement := make(map[string]*Element, 30)

	model.FindTopLists(urls, false, func(topList []*model.TopList) {
		// build title and subtitle
		for i := range urls {
			list := topList[i]
			title += " " + list.Level
			if list.Title != subtitle {
				subtitle += list.Title
			}
		}

		isImxTable = len(topList[0].ImxTitle) > 0
		if isImxTable {
			header = make([]string, 0, 11)
			header = append(header, "Name", "Score")
			header = append(header, topList[0].ImxTitle...)
			header = append(header, "Age", "Birthday", "LSC", "Team")
			link = []int{11, -1, -1, -1, -1, -1, -1, -1, 12}
			action = []string{ActionSearch, "", "", "", "", "", "", "", ActionBirthday}
			lalign = []bool{true, false, false, false, false, false, false, false, true, true, true}
			filterCol = 11
		}

		for i := range urls {
			list := topList[i]
			for _, row := range list.List {
				bdayData := row.Url
				lsc := strings.ToUpper(regex.MatchOne(row.Url, `strokes_([^/]+)/`, 1))

				model.Find(row.Sid, false, func(swimmer *model.Swimmer, _ string) {
					if swimmer != nil {
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
				})

				if isImxTable {
					item := make([]any, 0, 12)
					item = append(item, row.Name, *row.Score)
					item = append(item, ToAnySlice(row.ImxScores)...)
					item = append(item, row.Age, "Find out", lsc, row.Team, row.Url, bdayData)
					items = append(items, item)
				} else {
					items = append(items, []any{row.Name, model.FormatSwimTime(*row.Time), row.Date.Format("1/02/06"),
						row.Age, "Find out", lsc, row.Team, row.Meet, row.Url, bdayData})
				}

				if maxAge < row.Age {
					maxAge = row.Age
				}
			}

			// build addition menus
			for _, mlink := range list.Links {
				if e, ok := textToElement[mlink.Text]; ok {
					e.Link += "," + mlink.Url
				} else {
					e := &Element{Text: mlink.Text, Link: mlink.Url, Action: ActionSearch}
					textToElement[mlink.Text] = e
					elements = append(elements, e)
				}
			}
		}
	})

	if isImxTable {
		sort.Slice(items, func(i, j int) bool {
			return items[i][1].(int) > items[j][1].(int) ||
				items[i][1].(int) == items[j][1].(int) && items[i][7].(int) > items[j][7].(int)
		})
	} else {
		time := func(v any) int { return model.ParseSwimTime(fmt.Sprint(v)) }
		sort.Slice(items, func(i, j int) bool {
			return time(items[i][1]) < time(items[j][1]) ||
				time(items[i][1]) == time(items[j][1]) && items[i][3].(int) < items[j][3].(int)
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
		Additions:    elements,
	}
}

func generateSearchTable(name string, items [][]string) *Table {
	// items : name | age | team | lsc | sid | url
	exist := make(map[string]bool, len(items))
	for _, item := range items {
		exist[item[4]] = true
	}

	for _, sid := range model.FindAlias(name) {
		if _, ok := exist[sid]; !ok {
			model.Find(sid, false, func(swimmer *model.Swimmer, url string) {
				items = utils.Insert(items, 0, []string{fmt.Sprintf("%s (%s)", swimmer.Name, swimmer.Alias),
					fmt.Sprint(swimmer.Age), swimmer.Team, regex.MatchOne(url, `/strokes_([^/]+)/`, 1), sid, url})
			})
		}
	}

	if len(items) == 0 {
		return createErrorTable("Cannot found " + name)
	}

	filterdItems := make([][]any, 0, len(items))
	for _, row := range items {
		if _, ok := exist[row[4]]; !ok || strings.EqualFold(row[0], name) {
			filterdItems = append(filterdItems, ToAnySlice(row))
		}
	}

	if len(filterdItems) == 0 {
		for _, row := range items {
			filterdItems = append(filterdItems, ToAnySlice(row))
		}
	}

	if len(filterdItems) == 1 {
		return getInfo(filterdItems[0][5].(string))
	}

	for _, row := range filterdItems {
		row[3] = strings.ToUpper(row[3].(string))
	}

	return &Table{
		Header:    []string{},
		Value:     []int{0, 1, 2, 3},
		Link:      []int{5},
		Action:    []string{ActionSearch},
		Items:     filterdItems,
		ShowOrder: true,
		LeftAlign: []bool{true, false, true},
	}
}

func buildSequenceIntSlice(length int) []int {
	slice := make([]int, 0, length)
	for i := 0; i < length; i++ {
		slice = append(slice, i)
	}
	return slice
}

func combineRows(items [][]any, col int, tdClass string) {
	var lastRow []any
	var lastValue any = ""
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
			row[col] = fmt.Sprintf(`<td rowspan="%d" class="%s %s">%v</td>`, count, tdClass, strings.ToLower(fmt.Sprint(row[col])), row[col])
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
		Items:  [][]any{{text}},
	}
}

func ToAnySlice[K any](input []K) []any {
	result := make([]any, 0, len(input))
	for _, v := range input {
		result = append(result, v)
	}
	return result
}
