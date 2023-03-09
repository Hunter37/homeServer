package swim

import (
	"encoding/json"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"time"

	"homeServer/regex"
	"homeServer/swim/model"
	"homeServer/utils"
)

var (
	stdList = []string{"B", "BB", "A", "AA", "AAA", "AAAA"}
)

func generateRankTable(swimmer *model.Swimmer, url string) *Table {
	header := make([]string, 0, 20)
	header = append(header, "Course", "Stroke", "Dist", "Time", "Date")
	longest := 0
	var levelName []string
	for _, ranks := range swimmer.Rankings {
		if longest < len(ranks.Ranks) {
			longest = len(ranks.Ranks)
			levelName = utils.Convert(ranks.Ranks, func(r model.Ranking) string {
				return r.Level
			})
		}
	}
	header = append(header, levelName...)
	header = append(header, "Count")
	header = append(header, stdList...)

	settings := model.GetSettings()
	header = append(header, settings.Standards...)

	items := make([][]any, 0, len(swimmer.Rankings))
	for _, ranks := range swimmer.Rankings {
		event := swimmer.GetBestEvent(ranks.Course, ranks.Stroke, ranks.Length)
		if event == nil {
			continue
		}
		item := make([]any, 0, len(header)+2)
		item = append(item, ranks.Course, ranks.Stroke, ranks.Length,
			utils.FormatSwimTime(event.Time), event.Date.Format("1/02/06"))

		// add ranks
		for i := 0; i < longest; i++ {
			if i < len(ranks.Ranks) {
				item = append(item, ranks.Ranks[i].Rank)
			} else {
				item = append(item, "")
			}
		}

		// add count
		item = append(item, len(swimmer.GetEvents(ranks.Course, ranks.Stroke, ranks.Length)))

		// add motivational standards
		stds := model.GetStandards(swimmer.Gender, swimmer.Age, ranks.Course, ranks.Stroke, ranks.Length)
		if len(stds) == 0 {
			item = append(item, "", "", "", "", "", "")
		} else {
			pre := append([]int{2*stds[0] - stds[1]}, stds...)
			item = append(item, utils.ConvertWithIndex(stds, func(i, t int) any {
				percent := 0
				class := "ad"
				if event.Time <= pre[i] {
					if event.Time > t {
						et := utils.GetSwimTimeInCentiSecond(event.Time)
						ct := utils.GetSwimTimeInCentiSecond(t)
						pt := utils.GetSwimTimeInCentiSecond(pre[i])
						percent = utils.Max(5, utils.Min(95, int(100.0*float32(pt-et)/float32(pt-ct))))
					} else {
						class = "dp"
						percent = 100
					}
				}
				return fmt.Sprintf(`<td class="ct g"><div class="%s">%s</div><div class="dd %s">%s</div><div class="r" style="left:%d%%;"></div></td>`,
					class, utils.FormatSwimTime(t), class, utils.CalculateSwimTimeDelta(t, event.Time), percent)
			})...)
		}

		// add meet standards
		for _, meet := range settings.Standards {
			time := model.GetAgeGroupMeetStandard(meet, swimmer.Gender, swimmer.Age, ranks.Course, ranks.Stroke, ranks.Length)
			if time <= 0 {
				item = append(item, "")
			} else {
				diff := utils.CalculateSwimTimeDelta(time, event.Time)
				class := "ad"
				et := utils.GetSwimTimeInCentiSecond(event.Time)
				ct := utils.GetSwimTimeInCentiSecond(time)
				pt := int(float32(ct) * 1.12)
				percent := utils.Max(0, utils.Min(100, int(100.0*float32(pt-et)/float32(pt-ct))))
				if event.Time <= time {
					class = "dp"
					percent = 100
				}
				item = append(item, fmt.Sprintf(`<td class="ct"'><div class="%s">%s</div><div class="dd %s">%s</div><div class="r" style="left:%d%%;"></div></td>`,
					class, utils.FormatSwimTime(time), class, diff, percent))
			}
		}

		// add trClass and first url
		item = append(item, fmt.Sprintf("d%d %s", ranks.Length, ranks.Stroke), ranks.Url)
		for i := 0; i < longest; i++ {
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
		Link:    []int{-1, -1, headerLen + 1, -1, -1, headerLen + 2, headerLen + 3, headerLen + 4, headerLen + 5, headerLen + 6, headerLen + 7},
		TrClass: &headerLen,
		Action:  []string{"", "", ActionHref, "", "", ActionSearch, ActionSearch, ActionSearch, ActionSearch, ActionSearch, ActionSearch},
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
		ageMax = utils.Max(ageMax, event.Age)
		ageMin = utils.Min(ageMin, event.Age)
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

	ageMax = utils.Max(ageMax, ageMin)
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
		item = append(item, utils.ToAnySlice(parts)...)
		for age := ageMax; age >= ageMin; age-- {
			key := fmt.Sprintf("%s %d", event, age)
			if e, found := eventAgeMap[key]; found {
				item = append(item, []any{utils.FormatSwimTime(e.Time), e.Standard, e.Date.Format("1/02/06")}...)
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
				stroke := parts[1]
				length := utils.ParseInt(parts[0])
				delta := swimmer.GetDelta(course, stroke, length, event)
				class := ""
				if strings.Contains(delta, "+") {
					class = "ad"
				} else if strings.Contains(delta, "-") {
					class = "dp"
				}

				std := model.GetStandard(swimmer.Gender, event.Age, course, stroke, length, event.Time)
				if length > 25 && std != event.Standard {
					utils.LogError(fmt.Errorf("bad standard time: %v %v %v %v %v %v %v",
						swimmer.Name, swimmer.Gender, event.Age, course, stroke, length, event.Time))
					//std = model.GetStandard(swimmer.Gender, event.Age, course, stroke, length, event.Time)
				}
				row = append(row, fmt.Sprintf(`<td class="ct d%s"><div class="%s">%s</div><div class="std">%s</div><div class="dd %s">%s</div></td>`,
					strings.ToLower(ls), class, utils.FormatSwimTime(event.Time), std, class, delta))
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
	minAge := 100
	elements := make([]*Element, 0, 30)
	textToElement := make(map[string]*Element, 30)

	topList := model.FindTopLists(urls)

	// build title and subtitle
	for i := range urls {
		list := topList[i]
		title += " " + list.Level
		if list.Title != subtitle {
			subtitle += list.Title
		}
	}

	gender, course, stroke, length := findGenderCourseStrokeLength(subtitle)

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

			swimmer, _ := model.Find(row.Sid)
			if swimmer != nil {
				if e := swimmer.GetBestEvent(course, stroke, length); e != nil {
					*row.Time = e.Time
				} else if !isImxTable {
					continue
				}

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
				item := make([]any, 0, 12)
				item = append(item, row.Name, *row.Score)
				item = append(item, utils.ToAnySlice(row.ImxScores)...)
				item = append(item, row.Age, "Find out", lsc, row.Team, row.Url, bdayData)
				items = append(items, item)
			} else {
				stds := model.GetStandards(gender, row.Age, course, stroke, length)
				std := ""
				for i, s := range stds {
					if *row.Time <= s {
						std = stdList[i]
					}
				}
				timeCol := fmt.Sprintf(`<td class="ct"'><div>%s</div><div class="std">%s</div></td>`,
					utils.FormatSwimTime(*row.Time), std)

				items = append(items, []any{row.Name, timeCol, row.Date.Format("1/02/06"),
					row.Age, "Find out", lsc, row.Team, row.Meet, row.Url, bdayData, *row.Time})
			}

			maxAge = utils.Max(maxAge, row.Age)
			minAge = utils.Min(minAge, row.Age)
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

	if isImxTable {
		sort.Slice(items, func(i, j int) bool {
			return items[i][1].(int) > items[j][1].(int) ||
				items[i][1].(int) == items[j][1].(int) && items[i][7].(int) > items[j][7].(int)
		})
	} else {
		sort.Slice(items, func(i, j int) bool {
			return items[i][10].(int)*100+items[i][3].(int) < items[j][10].(int)*100+items[j][3].(int)
		})
	}

	standardCol := 10
	standards := make([]Standard, 0)
	for _, meet := range model.GetSettings().Standards {
		for age := minAge; age <= maxAge; age++ {
			tm := model.GetAgeGroupMeetStandard(meet, gender, age, course, stroke, length)
			tstr := ""
			if tm > 0 {
				tstr = utils.FormatSwimTime(tm)
			}
			standards = append(standards, Standard{Meet: meet, Age: age, Time: tstr})
		}
	}

	return &Table{
		Title:          fmt.Sprintf("<h2>%s</h2><h3>%s</h3>", title, subtitle),
		Header:         header,
		Link:           link,
		Action:         action,
		LeftAlign:      lalign,
		Items:          items,
		ShowOrder:      true,
		FilterColumn:   filterCol,
		Age:            maxAge,
		Additions:      elements,
		StandardColumn: standardCol,
		Standards:      standards,
	}
}

func findGenderCourseStrokeLength(title string) (string, string, string, int) {
	gender := model.Male
	if strings.Contains(title, "Girl") {
		gender = model.Female
	}
	course := model.SCY
	if strings.Contains(title, "LCM") || strings.Contains(title, "Meters") {
		course = model.LCM
	}
	stroke := model.Free
	for str, stk := range model.StrokeMapping {
		if strings.Contains(title, str) {
			stroke = stk
			break
		}
	}

	length := 0
	numbers := regexp.MustCompile(`\d+`).FindAllString(title, -1)
	for _, n := range numbers {
		val := utils.ParseInt(n)
		if val > 24 {
			length = val
			break
		}
	}

	return gender, course, stroke, length
}

func generateSearchTable(name string, items [][]string) *Table {
	// items : name | age | team | lsc | sid | url

	// sort by name
	sort.Slice(items, func(i, j int) bool {
		return fmt.Sprint(items[i][0]) < fmt.Sprint(items[j][0])
	})

	exist := make(map[string]bool, len(items))
	for _, item := range items {
		exist[item[4]] = true
	}

	cached := findCachedName(name, exist)

	if len(items) == 0 && len(cached) == 0 {
		return createErrorTable("Cannot found " + name)
	}

	filterdItems := make([][]any, 0, len(items))
	for _, row := range items {
		if _, ok := exist[row[4]]; !ok || strings.EqualFold(row[0], name) {
			filterdItems = append(filterdItems, utils.ToAnySlice(row))
		}
	}

	if len(filterdItems) == 0 {
		for _, row := range items {
			filterdItems = append(filterdItems, utils.ToAnySlice(row))
		}
	}

	filterdItems = append(cached, filterdItems...)

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

func findCachedName(name string, exist map[string]bool) [][]any {
	cached := make([][]any, 0, 10)
	for _, sid := range model.FindName(name) {
		if _, ok := exist[sid]; !ok {
			swimmer, url := model.Find(sid)
			alias := ""
			if len(swimmer.Alias) > 0 {
				alias = fmt.Sprintf(" (%s)", swimmer.Alias)
			}
			cached = append(cached, []any{fmt.Sprint(swimmer.Name, alias),
				fmt.Sprint(swimmer.Age), swimmer.Team, regex.MatchOne(url, `/strokes_([^/]+)/`, 1), sid, url})
		}
	}
	return cached
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
