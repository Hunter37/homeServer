package swim

import (
	"fmt"
	"log"
	"net/url"
	"regexp"
	"strings"
	"time"

	. "homeServer/http"
	"homeServer/regex"
	"homeServer/swim/model"
	"homeServer/utils"
)

const (
	ActionHref     = "href"
	ActionSearch   = "search"
	ActionBirthday = "birthday"

	timeout = 2 * time.Hour
)

func Start() func() {
	if err := model.Load(); err != nil {
		log.Fatal("main data load failed!")
	}

	model.DataMigration()
	stopPool := StartBackgroundDownloadPool()

	return func() {
		stopPool()
		model.Save()
	}
}

func birthday(url string) (time.Time, time.Time) {
	needDownload := false
	sid := regex.MatchOne(url, "/([^/]+)_meets.html", 1)
	model.Find(sid, false, func(swimmer *model.Swimmer, _ string) {
		needDownload = swimmer == nil || swimmer.Update.Add(timeout).Before(time.Now())
	})

	if needDownload {
		utils.Log(fmt.Sprintf("%s \033[34m%s\033[0m\n", utils.GetLogTime(), url))
		var err error
		sid, err = extractSwimmerAllData(url)
		if err != nil {
			utils.LogError(err)
			return time.Now(), time.Now()
		}
	}

	var left time.Time
	var right time.Time
	model.Find(sid, false, func(swimmer *model.Swimmer, _ string) {
		left, right = swimmer.GetBirthday()
	})
	return left, right
}

func search(text string) *Table {
	text = strings.TrimSpace(text)
	text = regexp.MustCompile("#.*$").ReplaceAllString(text, "")

	if strings.Index(text, "https://") == 0 {
		if strings.Contains(text, `/strokes/`) {
			return getInfo(text)
		}
		return getRanks(text)
	}

	return getSearchResult(text)
}

func getSearchResult(name string) *Table {
	mode := model.GetSettings().SearchMode
	items := make([][]string, 0)

	if mode != model.OFFLINE {
		body, err := HttpPost("https://swimmingrank.com/cgi-bin/main_search.cgi",
			"searchstring="+url.QueryEscape(name))
		if err != nil {
			utils.LogError(err)
			return createErrorTable(err.Error())
		}

		body = removeHTMLSpace(removeFooter(body))

		_, items = findTable(body, []int{1, 2, 3}, func(row string) []string {
			return regex.MatchRow(row, `https://www.swimmingrank.com/[^/]+/strokes/strokes_([^/]+)/([^/]+)_meets.html`, []int{1, 2, 0})
		})
	}

	return generateSearchTable(name, items)
}

func getInfo(url string) *Table {
	sid := regex.MatchOne(url, "/([^/]+)_meets.html", 1)
	mode := model.GetSettings().SearchMode

	var errStr string
	needDownload := false
	if mode == model.ONLINE {
		needDownload = true
	} else {
		model.Find(sid, false, func(swimmer *model.Swimmer, _ string) {
			if mode == model.CACHE {
				needDownload = swimmer == nil || swimmer.Update.Add(timeout).Before(time.Now())
			} else { // model.OFFLINE
				if swimmer == nil {
					errStr = "Cannot find the swimmer in offline mode!"
				}
			}
		})
	}

	if len(errStr) > 0 {
		return createErrorTable(errStr)
	}

	if needDownload {
		utils.Log(fmt.Sprintf("%s \033[34m%s\033[0m\n", utils.GetLogTime(), url))

		var err error
		sid, err = extractSwimmerAllData(url)
		if err != nil {
			return createErrorTable(err.Error())
		}
	}

	var mainTable *Table
	model.Find(sid, false, func(swimmer *model.Swimmer, _ string) {
		mainTable = generateRankTable(swimmer, url)
		lastTable := mainTable

		lastTable.Next = generateAgeBestTable(swimmer)
		lastTable = lastTable.Next

		lastTable.Next = generateEventsTable(swimmer, "SCY")
		lastTable = lastTable.Next

		lastTable.Next = generateEventsTable(swimmer, "LCM")
	})

	return mainTable
}

func getRanks(text string) *Table {
	urls := strings.Split(text, ",")
	mode := model.GetSettings().SearchMode

	needDownload := make([]string, 0, len(urls))
	if mode == model.ONLINE {
		needDownload = urls
	} else if mode == model.CACHE {
		model.FindTopLists(urls, false, func(topList []*model.TopList) {
			for i, list := range topList {
				if list == nil || list.Update.Add(timeout).Before(time.Now()) {
					needDownload = append(needDownload, urls[i])
				}
			}
		})
	}

	for _, url := range needDownload {
		utils.Log(fmt.Sprintf("%s \033[34m%s\033[0m\n", utils.GetLogTime(), url))
	}
	extractTopListFromPage(needDownload)

	cached := make([]string, 0, len(urls))
	model.FindTopLists(urls, false, func(topList []*model.TopList) {
		for i, list := range topList {
			if list != nil {
				cached = append(cached, urls[i])
			}
		}
	})

	if len(cached) == 0 {
		return createErrorTable("Cannot find the ranking info in offline mode.")
	}

	return generateTopListTable(cached)
}
