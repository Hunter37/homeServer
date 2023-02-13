package swim

import (
	"fmt"
	"strings"
	"time"
)

func generateRankTable(swimmer *Swimmer, url string) *Table {
	header := make([]string, 0, 12)
	header = append(header, "Crs", "Strk", "Dist", "Time", "Date", "Count")
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
	combineRows(items, 1, "age")

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
	headerLen := len(header)

	subHeader := make([]string, 0, 3*headerLen-2)
	subHeader = append(subHeader, `Event`)
	for i := 1; i < headerLen; i++ {
		subHeader = append(subHeader, []string{`Time`, `Std`, `Date`}...)
	}

	value := make([]int, 0, 3*headerLen-2)
	for i := 0; i < 3*headerLen-2; i++ {
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
		item = append(item, fmt.Sprint("d", event))
		items = append(items, compressRow(item))
	}

	headerLen = 3*headerLen - 2
	return &Table{
		Header:  header,
		Value:   value,
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
	}
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
			row[col] = fmt.Sprintf(`<td rowspan="%d" class="%s">%s</td>`, count, tdClass, row[col])
		}
		lastRow = row
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
