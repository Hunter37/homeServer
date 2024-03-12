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

	timeoutBuffer = 10
)

var (
	httpPool *HttpPool
)

func Start() func() {
	err := model.LoadSettings()
	if err != nil {
		log.Fatal("main data load failed!", err)
	}

	httpPool = StartHttpPool(10)
	stopPool := StartBackgroundDownloadPool(5)

	return func() {
		stopPool()
		httpPool.Stop()
	}
}

func birthday(url string) (time.Time, time.Time) {
	swimmer := GetCachedSwimmerFromMeetUrl(url)
	if swimmer.Name == "" {
		logDownloadUrl(url)
		err := extractSwimmerAllData(url, swimmer, httpPool)
		if err != nil {
			utils.LogError(err)
			return time.Now(), time.Now()
		}
	}

	var left time.Time
	var right time.Time
	left, right = swimmer.GetBirthday()
	return left, right
}

func GetCachedSwimmerFromMeetUrl(url string) *model.Swimmer {
	match := regex.MatchRow(url, `/([^/]+)/strokes/strokes_([^/]+)/([^/]+)_meets.html`, []int{1, 2, 3})
	if len(match) != 3 {
		utils.LogError(fmt.Errorf("getInfo Invalid URL: %s", url))
		return nil
	}
	lscId := match[0] + "|" + match[1]
	sid := match[2]

	swimmer := model.GetSwimmerFormCache(lscId + ":" + sid)
	if swimmer == nil {
		swimmer = &model.Swimmer{
			LscID: lscId,
			ID:    sid,
		}
	}
	return swimmer
}

func logDownloadUrl(url string) {
	if utils.SimpleLog {
		utils.Logf("%s %s\n", utils.GetLogTime(), url)
	} else {
		utils.Logf("%s \033[94m%s\033[0m\n", utils.GetLogTime(), url)
	}
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
			match := regex.MatchRow(row, `https://.+/([^/]+)/strokes/strokes_([^/]+)/([^/]+)_meets.html`, []int{0, 1, 2, 3})
			return []string{match[1] + "|" + match[2], match[3], match[0]}
		})
		// items : name | age | team | lscId | sid | url
	}

	return generateSearchTable(name, items)
}

func getInfo(url string) *Table {

	swimmer := GetCachedSwimmerFromMeetUrl(url)

	mode := model.GetSettings().SearchMode
	needDownload := false
	if mode == model.ONLINE {
		needDownload = true
	} else if mode == model.CACHE {
		if swimmer.Name == "" {
			needDownload = true
		} else {
			timeout := time.Duration(model.GetSettings().CacheTimeInMinutes+timeoutBuffer) * time.Minute
			needDownload = swimmer.Update.Add(timeout).Before(time.Now())
		}
	} else { // model.OFFLINE
		if swimmer.Name == "" {
			return createErrorTable("Cannot find the swimmer in offline mode!")
		}
	}

	if needDownload {
		logDownloadUrl(url)

		err := extractSwimmerAllData(url, swimmer, httpPool)
		if err != nil {
			return createErrorTable(err.Error())
		}
	}

	mainTable := generateRankTable(swimmer, url)
	lastTable := mainTable

	lastTable.Next = generateAgeBestTable(swimmer)
	lastTable = lastTable.Next

	lastTable.Next = generateEventsTable(swimmer, model.SCY)
	lastTable = lastTable.Next

	lastTable.Next = generateEventsTable(swimmer, model.LCM)

	return mainTable
}

func getRanks(text string) *Table {
	urls := strings.Split(text, ",")
	mode := model.GetSettings().SearchMode

	toplists := make([]*model.TopList, len(urls))

	if mode != model.ONLINE {
		toplists = findTopLists(urls)

		if mode == model.CACHE {
			for i, toplist := range toplists {
				timeout := time.Duration(model.GetSettings().CacheTimeInMinutes+timeoutBuffer) * time.Minute
				if toplist == nil || toplist.Update.Add(timeout).Before(time.Now()) {
					toplists[i] = nil
				}
			}
		}
	}

	for i, toplist := range toplists {
		if toplist == nil {
			logDownloadUrl(urls[i])
		} else {
			urls[i] = ""
		}
	}

	extractTopListsFromPages(urls, toplists)

	return generateTopListTable(toplists)
}

func findTopLists(urls []string) []*model.TopList {

	toplists := make([]*model.TopList, len(urls))
	for i, url := range urls {
		toplist, err := model.LoadTopList(url)
		if err != nil {
			utils.LogError(err)
			continue
		}
		toplists[i] = toplist
	}

	return toplists
}
