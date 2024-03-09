package swim

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"homeServer/regex"
	"homeServer/swim/model"
	"homeServer/utils"
)

func extractSwimmerAllData(url string, swimmer *model.Swimmer) error {
	body, err := httpPool.Get(url, true)
	if err != nil {
		utils.LogError(err)
		return err
	}

	extractSiwmmerInfoFromPage(body, swimmer)

	extractEventsAndRanksFromPages(body, swimmer)

	return model.WriteSwimmerToCache(swimmer)
}

func extractSiwmmerInfoFromPage(page string, swimmer *model.Swimmer) {
	name := regex.FindInnerPart(page, `<h1>`, `</h1>`)
	ageTable := regex.FindInnerPart(page, `<th>Age</th>`, `</tr>`)
	age := regex.MatchOne(ageTable, `>([^<>]+)</`, 1)
	genderTable := regex.FindInnerPart(page, `<th>Sex</th>`, `</tr>`)
	gender := regex.MatchOne(genderTable, `>([^<>]+)</`, 1)
	teamTable := regex.FindInnerPart(page, `<th>Team</th>`, `</tr>`)
	team := regex.MatchOne(teamTable, `>([^<>]+)</`, 1)
	lscName := regex.MatchOne(page, `LSC</th>[^>]*>([^<]+)</td>`, 1)

	swimmer.Name = name
	swimmer.Gender = gender
	swimmer.Team = strings.TrimSpace(team)
	swimmer.Age = utils.ParseInt(age)
	swimmer.LSC = lscName
}

func extractEventsAndRanksFromPages(page string, swimmer *model.Swimmer) {
	urls := getAllEventLinks(page)
	pages := httpPool.BatchGet(urls, true)

	scy := make([]model.Rankings, 0, 22+18)
	lcm := make([]model.Rankings, 0, 18)
	for i, page := range pages {
		url := urls[i]
		if len(page) == 0 {
			utils.LogError(fmt.Errorf("download page failed: %s", url))
			continue
		}
		page = removeFooter(removeHTMLSpace(page))

		// extract all events data
		extractEventDataFromPage(page, swimmer)

		// extract the rank of this page
		for _, rank := range getRankDataFromPage(url, page) {
			if rank.Course == model.LCM {
				lcm = append(lcm, rank)
			} else {
				scy = append(scy, rank)
			}
		}
	}

	swimmer.Rankings = append(scy, lcm...)
}

func getAllEventLinks(body string) []string {
	events := regex.FindInnerPart(body, `<div id="event_menu">`, `</div>`)
	urls := regex.MatchColumn(events, `<a href="([^<>]+)">\d`, 1)
	return urls
}

func extractEventDataFromPage(body string, swimmer *model.Swimmer) {
	tables := regex.FindPartList(body, `<h3>`, `</table>`)
	for _, table := range tables {
		event := regex.FindInnerPart(table, `<h3>`, `</h3>`)
		parts := strings.SplitN(event, " ", 3)
		if len(parts) != 3 {
			utils.LogError(fmt.Errorf("wrong event name: [%s]", event))
			continue
		}
		course := model.SCY
		if strings.Contains(parts[1], "Meters") {
			course = model.LCM
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
				powerPoint = utils.ParseInt(row[4])
			}
			dataEvent := &model.Event{
				Date:       date,
				Age:        utils.ParseInt(row[1]),
				Time:       utils.ParseSwimTime(row[2]),
				Standard:   row[3],
				PowerPoint: powerPoint,
				Team:       row[5],
				Meet:       row[6],
			}

			swimmer.AddEvent(course, stroke, length, dataEvent)
		}
	}
}

func getRankDataFromPage(url, page string) []model.Rankings {
	table := regex.FindPart(page, `<h2>Rankings by Career Best</h2>`, `</table>`)

	links := make([][]string, 0)
	header, ranks := findTable(table, nil, func(row string) []string {
		link := regex.MatchColumn(row, `href='([^']+.html)[^']*'">`, 1)
		links = append(links, link)
		return nil
	})

	rankings := make([]model.Rankings, 0, 2)
	for i, r := range ranks {
		parts := strings.Split(r[0], " ")
		if len(parts) != 3 {
			utils.LogError(fmt.Errorf("event type name is wrong in rank table :%s", r[0]))
			return rankings
		}
		course := model.SCY
		if parts[1] == "M" {
			course = model.LCM
		}
		ranks := model.Rankings{
			Url:    url,
			Course: course,
			Stroke: parts[2],
			Length: utils.ParseInt(parts[0]),
			Ranks:  make([]model.Ranking, 0, 6),
		}
		index := 0
		for j := 4; j < len(r); j++ {
			if n, err := strconv.Atoi(r[j]); err == nil {
				rank := model.Ranking{
					Level: header[j],
					Rank:  n,
					Link:  links[i][index],
				}
				ranks.Ranks = append(ranks.Ranks, rank)
				index++
			}
		}

		rankings = append(rankings, ranks)
	}

	return rankings
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

func extractTopListsFromPages(urls []string, toplists []*model.TopList) {
	pages := httpPool.BatchGet(urls, true)

	for i, page := range pages {
		if len(page) > 0 {
			_, toplist := extractTopListFromPage(page)
			toplists[i] = toplist

			//model.AddTopList(url, tl)
			model.SaveTopList(urls[i], toplist)

		}
	}
}

func extractTopListFromPage(page string) ([]string, *model.TopList) {
	links := make([]string, 0, 1000)

	page = removeFooter(removeHTMLSpace(page))

	title, rows := findTable(page, nil, func(row string) []string {
		m := regex.MatchRow(row, `(https://[^/]+/[^/]+/strokes/strokes_[a-z]+/)[^A-Z]*([A-Z0-9_]+)_[0-9a-zA-Z]+.html`, []int{1, 2})
		if len(m) == 0 {
			return []string{}
		}
		sid := m[1]
		link := m[0] + m[1] + "_meets.html"
		return []string{sid, link}
	})

	index := func(v string) int {
		for i, s := range title {
			if strings.Contains(strings.ToLower(s), strings.ToLower(v)) {
				return i
			}
		}
		return -1
	}

	sidIndex := len(title)
	urlIndex := len(title) + 1
	nameIndex := index("Swimmer")
	ageIndex := index("Age")
	teamIndex := index("Club")
	if teamIndex < 0 {
		teamIndex = index("Team")
	}
	timeIndex := index("Time")
	dateIndex := index("Date")
	meetIndex := index("Meet")
	scoreIndex := index("Score")

	items := make([]model.ListItem, 0, 1000)
	for _, row := range rows {
		item := model.ListItem{
			Sid:  row[sidIndex],
			Url:  row[urlIndex],
			Name: row[nameIndex],
			Age:  utils.ParseInt(row[ageIndex]),
			Team: row[teamIndex],
		}
		if scoreIndex > -1 {
			item.Score = intToPointer(utils.ParseInt(row[scoreIndex]))
			item.ImxScores = convertToIntSlice(row[scoreIndex-5 : scoreIndex])
		} else {
			date, _ := time.Parse("1/2/06", row[dateIndex])
			item.Time = intToPointer(utils.ParseSwimTime(row[timeIndex]))
			item.Date = &date
			item.Meet = row[meetIndex]
		}

		items = append(items, item)
		links = append(links, item.Url)
	}

	subTitle := regex.MatchOne(page, "<h2>(.+)</h2>", 1)
	subTitle = regexp.MustCompile(`<[^>]*>`).ReplaceAllString(subTitle, " ")

	tl := &model.TopList{
		Level: strings.Replace(regex.FindInnerPart(page, "<h1>", "</h1>"), "Swimming", "", -1),
		Title: subTitle,
		List:  items,
		Links: append(*parseMenuItems(page, "event_menu"), *parseMenuItems(page, "imx_menu")...),
	}
	if scoreIndex > -1 {
		tl.ImxTitle = title[scoreIndex-5 : scoreIndex]
	}

	return links, tl
}

func removeFooter(body string) string {
	if index := strings.LastIndex(body, `<table border="0"`); index > 0 {
		body = body[:index]
	}
	return body
}

func removeHTMLSpace(body string) string {
	body = strings.Replace(body, "\n", "", -1)
	body = strings.Replace(body, "\r", "", -1)
	body = regexp.MustCompile(`>\s+`).ReplaceAllString(body, ">")
	body = regexp.MustCompile(`\s+<`).ReplaceAllString(body, "<")
	return body
}

func parseMenuItems(body, htmlId string) *[]model.Link {
	body = regex.FindInnerPart(body, `<div id="`+htmlId+`"`, "</div>")
	list := regex.FindPartList(body, "<a ", "/a>")
	links := make([]model.Link, 0, 25)
	for _, item := range list {
		link := model.Link{
			Text: regex.FindInnerPart(item, `>`, `<`),
			Url:  regex.FindInnerPart(item, `"`, `"`),
		}

		if strings.EqualFold(link.Text, "Current Season") {
			continue
		}

		if !strings.Contains(link.Url, "imr.html") && !strings.Contains(link.Url, "imx.html") &&
			!strings.Contains(link.Url, "_current.html") {
			link.Url = strings.Replace(link.Url, ".html", "_current.html", 1)
		}

		if strings.EqualFold(link.Text, "IMR") {
			if strings.Contains(link.Url, "lcm") {
				link.Text = model.LCM + " " + link.Text
			} else {
				link.Text = model.SCY + " " + link.Text
			}
		}

		links = append(links, link)
	}
	return &links
}

func intToPointer(n int) *int {
	return &n
}

func convertToIntSlice(texts []string) []int {
	result := make([]int, 0, len(texts))
	for _, t := range texts {
		if len(t) == 0 {
			result = append(result, 0)
		} else {
			result = append(result, utils.ParseInt(t))
		}
	}
	return result
}
