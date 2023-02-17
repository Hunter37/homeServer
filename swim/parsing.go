package swim

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	. "homeServer/http"
	"homeServer/regex"
	"homeServer/swim/model"
	"homeServer/utils"
)

func extractSwimmerAllData(url string) (string, error) {
	sid := regex.MatchOne(url, "/([^/]+)_meets.html", 1)

	body, err := HttpGet(url)
	if err != nil {
		utils.LogError(err)
		return "", err
	}

	extractSiwmmerInfoFromPage(sid, body)

	extractEventsAndRanksFromPages(sid, body)

	return sid, nil
}

func extractSiwmmerInfoFromPage(sid string, body string) {
	name := regex.FindInnerPart(body, `<h1>`, `</h1>`)
	ageTable := regex.FindInnerPart(body, `<th>Age</th>`, `</tr>`)
	age := regex.MatchOne(ageTable, `>([^<>]+)</`, 1)
	genderTable := regex.FindInnerPart(body, `<th>Sex</th>`, `</tr>`)
	gender := regex.MatchOne(genderTable, `>([^<>]+)</`, 1)
	teamTable := regex.FindInnerPart(body, `<th>Team</th>`, `</tr>`)
	team := regex.MatchOne(teamTable, `>([^<>]+)</`, 1)
	lscName := regex.MatchOne(body, `LSC</th>[^>]*>([^<]+)</td>`, 1)
	lscId := regex.MatchOne(body, `swimmingrank.com/([^/]+/[^/]+)/clubs.html`, 1)

	model.AddSwimmer(lscId, lscName, sid, name, gender, team, model.ParseInt(age))
}

func extractEventsAndRanksFromPages(sid, body string) {
	urls := getAllEventLinks(body)
	pages := BatchGet(urls)

	scy := make([]model.Rankings, 0, 18+17)
	lcm := make([]model.Rankings, 0, 17)
	for i, page := range pages {
		page = removeFooter(removeHTMLSpace(page))

		// extract all events data
		extractEventDataFromPage(sid, page)

		// extract the rank of this page
		for _, rank := range getRankDataFromPage(page) {
			rank.Url = urls[i]
			if rank.Course == "LCM" {
				lcm = append(lcm, rank)
			} else {
				scy = append(scy, rank)
			}
		}
	}

	model.Find(sid, true, func(swimmer *model.Swimmer, _ string) {
		swimmer.Rankings = append(scy, lcm...)
	})
}

func getAllEventLinks(body string) []string {
	events := regex.FindInnerPart(body, `<div id="event_menu">`, `</div>`)
	urls := regex.MatchColumn(events, `<a href="([^<>]+)">\d`, 1)
	return urls
}

func extractEventDataFromPage(sid, body string) {
	tables := regex.FindPartList(body, `<h3>`, `</table>`)
	for _, table := range tables {
		event := regex.FindInnerPart(table, `<h3>`, `</h3>`)
		parts := strings.SplitN(event, " ", 3)
		if len(parts) != 3 {
			utils.LogError(fmt.Errorf("wrong event name: [%s]", event))
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
				powerPoint = model.ParseInt(row[4])
			}
			dataEvent := &model.Event{
				Date:       date,
				Age:        model.ParseInt(row[1]),
				Time:       model.ParseSwimTime(row[2]),
				Standard:   row[3],
				PowerPoint: powerPoint,
				Team:       row[5],
				Meet:       row[6],
			}

			model.AddEvent(sid, course, stroke, length, dataEvent)
		}
	}
}

func getRankDataFromPage(body string) []model.Rankings {
	table := regex.FindPart(body, `<h2>Rankings by Career Best</h2>`, `</table>`)

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
		course := "SCY"
		if parts[1] == "M" {
			course = "LCM"
		}
		ranks := model.Rankings{
			Course: course,
			Stroke: parts[2],
			Length: model.ParseInt(parts[0]),
			Ranks:  make([]model.Ranking, 0, 6),
		}
		for j := 4; j < len(r); j++ {
			if n, err := strconv.Atoi(r[j]); err == nil {
				rank := model.Ranking{
					Level: header[j],
					Rank:  n,
					Link:  links[i][j-4],
				}
				ranks.Ranks = append(ranks.Ranks, rank)
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

func extractTopListFromPage(urls []string) []string {
	pages := BatchGet(urls)
	links := make([]string, 0, 1000)

	for i, page := range pages {
		page = removeFooter(removeHTMLSpace(page))

		title, rows := findTable(page, nil, func(row string) []string {
			m := regex.MatchRow(row, `(https://www.swimmingrank.com/[^/]+/strokes/strokes_[a-z]+/)[^A-Z]*([A-Z0-9_]+)_[0-9a-zA-Z]+.html`, []int{1, 2})
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
				Age:  model.ParseInt(row[ageIndex]),
				Team: row[teamIndex],
			}
			if scoreIndex > -1 {
				item.Score = intToPointer(model.ParseInt(row[scoreIndex]))
				item.ImxScores = convertToIntSlice(row[scoreIndex-5 : scoreIndex])
			} else {
				date, _ := time.Parse("1/02/06", row[dateIndex])
				item.Time = intToPointer(model.ParseSwimTime(row[timeIndex]))
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

		model.AddTopList(urls[i], tl)
	}

	return links
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
				link.Text = "LCM " + link.Text
			} else {
				link.Text = "SCY " + link.Text
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
			result = append(result, model.ParseInt(t))
		}
	}
	return result
}
