package swim

import (
	"errors"
	"strconv"
	"strings"
	"time"

	. "homeServer/http"
	"homeServer/regex"
	"homeServer/utils"
)

func extractSwimmerAllData(url string) (*Swimmer, error) {
	sid := regex.MatchOne(url, "/([^/]+)_meets.html", 1)

	body, err := HttpGet(url)
	if err != nil {
		utils.LogError(err)
		return nil, err
	}
	//body = strings.Replace(body, "\n", "", -1)
	//body = strings.Replace(body, "\r", "", -1)

	swimmer := extractSiwmmerInfoFromPage(sid, body)

	extractEventsAndRanksFromPages(swimmer, body)

	return swimmer, nil
}

func extractSiwmmerInfoFromPage(sid string, body string) *Swimmer {
	name := regex.FindInnerPart(body, `<h1>`, `</h1>`)
	ageTable := regex.FindInnerPart(body, `<th>Age</th>`, `</tr>`)
	age := regex.MatchOne(ageTable, `>([^<>]+)</`, 1)
	genderTable := regex.FindInnerPart(body, `<th>Sex</th>`, `</tr>`)
	gender := regex.MatchOne(genderTable, `>([^<>]+)</`, 1)
	teamTable := regex.FindInnerPart(body, `<th>Team</th>`, `</tr>`)
	team := regex.MatchOne(teamTable, `>([^<>]+)</`, 1)
	lscName := regex.MatchOne(body, `LSC</th>[^>]*>([^<]+)</td>`, 1)
	lscId := regex.MatchOne(body, `swimmingrank.com/([^/]+/[^/]+)/clubs.html`, 1)

	swimmer := data.AddSwimmer(lscId, lscName, sid, name, gender, team, parseInt(age))
	return swimmer
}

func extractEventsAndRanksFromPages(swimmer *Swimmer, body string) {
	urls := getAllEventLinks(body)
	pages := BatchGet(urls)

	scy := make([]Rankings, 0, 18+17)
	lcm := make([]Rankings, 0, 17)
	for i, body := range pages {
		// extract all events data
		extractEventDataFromPage(swimmer, body)

		// extract the rank of this page
		for _, rank := range getRankDataFromPage(body) {
			rank.Url = urls[i]
			if rank.Course == "LCM" {
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

func extractEventDataFromPage(swimmer *Swimmer, body string) {
	body = strings.Replace(body, "\n", "", -1)
	body = strings.Replace(body, "\r", "", -1)

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

			swimmer.AddEvent(course, stroke, length, dataEvent)
		}
	}
}

func getRankDataFromPage(body string) []Rankings {
	table := regex.FindPart(body, `<h2>Rankings by Career Best</h2>`, `</table>`)

	links := make([][]string, 0)
	header, ranks := findTable(table, nil, func(row string) []string {
		link := regex.MatchColumn(row, `href='([^']+)'">`, 1)
		links = append(links, link)
		return nil
	})

	rankings := make([]Rankings, 0, 2)
	for i, r := range ranks {
		parts := strings.Split(r[0], " ")
		if len(parts) != 3 {
			utils.LogError(errors.New("Event type name is wrong in rank table" + r[0]))
			return rankings
		}
		course := "SCY"
		if parts[1] == "M" {
			course = "LCM"
		}
		ranks := Rankings{
			Course: course,
			Stroke: parts[2],
			Length: parseInt(parts[0]),
			Ranks:  make([]Ranking, 0, 6),
		}
		for j := 4; j < len(r); j++ {
			if n, err := strconv.Atoi(r[j]); err == nil {
				rank := Ranking{
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

func parseInt(str string) int {
	n, err := strconv.Atoi(str)
	utils.LogError(err)
	return n
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
