package model

import (
	"compress/gzip"
	"encoding/gob"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"homeServer/utils"
)

const (
	SCY    = "SCY"
	LCM    = "LCM"
	Free   = "Free"
	Back   = "Back"
	Breast = "Breast"
	Fly    = "Fly"
	IM     = "IM"
	Male   = "Male"
	Female = "Female"
)

var (
	StrokeMapping = map[string]string{
		"Freestyle":         Free,
		"Backstroke":        Back,
		"Breaststroke":      Breast,
		"Butterfly":         Fly,
		"Individual Medley": IM,
	}
)

type Event struct {
	Date       time.Time `json:",omitempty"`
	Age        int       `json:",omitempty"`
	Time       int       `json:",omitempty"`
	Standard   string    `json:",omitempty"`
	PowerPoint int       `json:",omitempty"`
	Team       string    `json:",omitempty"`
	Meet       string    `json:",omitempty"`
	Invalid    bool      `json:",omitempty"`
}

func (e *Event) MarshalJSON() ([]byte, error) {
	type EventWrapper Event
	return json.Marshal(&struct {
		Date string `json:",omitempty"`
		Time string `json:",omitempty"`
		*EventWrapper
	}{
		Date:         e.Date.Format("2006/01/02"),
		Time:         utils.FormatSwimTime(e.Time),
		EventWrapper: (*EventWrapper)(e),
	})
}

func (e *Event) UnmarshalJSON(data []byte) error {
	type EventWrapper Event
	aux := &struct {
		Date string `json:",omitempty"`
		Time string `json:",omitempty"`
		*EventWrapper
	}{
		EventWrapper: (*EventWrapper)(e),
	}

	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	var err error
	if e.Date, err = time.Parse("2006/01/02", aux.Date); err != nil {
		return err
	}

	e.Time = utils.ParseSwimTime(aux.Time)

	return nil
}

type Length map[int][]*Event

type Stroke map[string]*Length

type Ranking struct {
	Level string `json:",omitempty"`
	Rank  int    `json:",omitempty"`
	Link  string `json:",omitempty"`
}

type Rankings struct {
	Url    string    `json:",omitempty"`
	Course string    `json:",omitempty"`
	Stroke string    `json:",omitempty"`
	Length int       `json:",omitempty"`
	Ranks  []Ranking `json:",omitempty"`
}

type Swimmer struct {
	ID       string     `json:",omitempty"`
	Name     string     `json:",omitempty"`
	Middle   string     `json:",omitempty"`
	Alias    string     `json:",omitempty"`
	Gender   string     `json:",omitempty"`
	Team     string     `json:",omitempty"`
	Age      int        `json:",omitempty"`
	Birthday *time.Time `json:",omitempty"`
	SCY      Stroke     `json:",omitempty"`
	LCM      Stroke     `json:",omitempty"`
	Rankings []Rankings `json:",omitempty"`

	Update time.Time `json:",omitempty"`
}

func (s *Swimmer) MarshalJSON() ([]byte, error) {
	bday := ""
	if s.Birthday != nil {
		bday = s.Birthday.Format("2006/01/02")
	}
	type SwimmerWrapper Swimmer
	return json.Marshal(&struct {
		Birthday string `json:",omitempty"`
		*SwimmerWrapper
	}{
		Birthday:       bday,
		SwimmerWrapper: (*SwimmerWrapper)(s),
	})
}

func (s *Swimmer) UnmarshalJSON(data []byte) error {
	type SwimmerWrapper Swimmer
	aux := &struct {
		Birthday string `json:",omitempty"`
		*SwimmerWrapper
	}{
		SwimmerWrapper: (*SwimmerWrapper)(s),
	}

	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	if len(aux.Birthday) > 0 {
		if bday, err := time.Parse("2006/01/02", aux.Birthday); err != nil {
			return err
		} else {
			s.Birthday = &bday
		}
	}

	return nil
}

type Lsc struct {
	LSC      string              `json:",omitempty"`
	Swimmers map[string]*Swimmer `json:",omitempty"`
}

type Swimmers map[string]*Lsc

type Data struct {
	Swimmers Swimmers `json:",omitempty"`
	TopLists TopLists `json:",omitempty"`
	Settings Settings `json:",omitempty"`
}

type TopLists map[string]*TopList

type TopList struct {
	Level string     `json:",omitempty"`
	Title string     `json:",omitempty"`
	List  []ListItem `json:",omitempty"`
	Links []Link     `json:",omitempty"`

	// imx list
	ImxTitle []string `json:",omitempty"`

	Update time.Time `json:",omitempty"`
}

type ListItem struct {
	Sid  string `json:",omitempty"`
	Url  string `json:",omitempty"`
	Name string `json:",omitempty"`
	Age  int    `json:",omitempty"`
	Team string `json:",omitempty"`

	// stroke list
	Time *int       `json:",omitempty"`
	Date *time.Time `json:",omitempty"`
	Meet string     `json:",omitempty"`

	// imx list
	ImxScores []int `json:",omitempty"`
	Score     *int  `json:",omitempty"`
}

type Link struct {
	Text string `json:",omitempty"`
	Url  string `json:",omitempty"`
}

var mainData = Data{}

var mutex = sync.RWMutex{}

func Save() string {
	mutex.RLock()
	defer mutex.RUnlock()
	data := &mainData

	str, err := json.Marshal(data)
	if err == nil {
		err = os.WriteFile("data.json", str, 0o600)
	}

	if err != nil {
		utils.LogError(err, "Main data save failed!")
	} else {
		utils.Log(utils.GetLogTime() + " Main data saved!\n")
	}

	return getInfo(data)
}

func Backup(path string) error {
	mutex.RLock()
	defer mutex.RUnlock()
	data := &mainData

	return backup(path, data)
}

func backup(path string, data *Data) error {
	file, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE, 0o600)
	if err != nil {
		return err
	}

	gzipWriter, err := gzip.NewWriterLevel(file, gzip.BestCompression)
	if err != nil {
		return err
	}

	gobEnc := gob.NewEncoder(gzipWriter)
	err = gobEnc.Encode(data)
	if err != nil {
		return err
	}

	return gzipWriter.Close()
}

func recover(path string, data *Data) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}

	gzipReader, err := gzip.NewReader(file)
	if err != nil {
		return err
	}

	gobDec := gob.NewDecoder(gzipReader)
	err = gobDec.Decode(data)
	if err != nil {
		return err
	}

	return gzipReader.Close()
}

func Load() error {
	mutex.Lock()
	defer mutex.Unlock()
	data := &mainData

	return load("data.json", data)
}

func load(filePath string, data *Data) error {
	if str, err := os.ReadFile(filePath); err != nil {
		return err
	} else {
		err = json.Unmarshal(str, data)
		if err == nil {
			utils.Log(getInfo(data))
		}

		return err
	}
}

func getInfo(data *Data) string {
	var b strings.Builder
	total := 0
	for _, lsc := range utils.SortedKeys(data.Swimmers) {
		b.WriteString(fmt.Sprintf("%-30s : %d\n", fmt.Sprintf("%s (%s)",
			data.Swimmers[lsc].LSC, lsc), len(data.Swimmers[lsc].Swimmers)))
		total += len(data.Swimmers[lsc].Swimmers)
	}
	b.WriteString(fmt.Sprintf("total = %d\n", total))

	return b.String()
}

// FindTopLists return the slice of toplist
func FindTopLists(urls []string) []*TopList {
	mutex.RLock()
	defer mutex.RUnlock()
	data := &mainData

	lists := make([]*TopList, len(urls))
	for i, url := range urls {
		if list, ok := data.TopLists[url]; ok {
			lists[i] = list
		}
	}

	return utils.Clone(lists)
}

// AddTopList append toplist with menu links to main data
func AddTopList(url string, toplist *TopList) {
	toplist = utils.Clone(toplist)

	mutex.Lock()
	defer mutex.Unlock()
	data := &mainData

	if data.TopLists == nil {
		data.TopLists = make(map[string]*TopList)
	}
	toplist.Update = time.Now()
	data.TopLists[url] = toplist
}

// Find return the swimmer object and the url string
func Find(sid string) (*Swimmer, string) {
	mutex.RLock()
	defer mutex.RUnlock()
	data := &mainData

	var swimmer *Swimmer
	var url string
	for path, lsc := range data.Swimmers {
		if s, ok := lsc.Swimmers[sid]; ok {
			swimmer = s
			parts := strings.Split(path, "/")
			url = fmt.Sprintf(`https://www.swimmingrank.com/%s/strokes/strokes_%s/%s_meets.html`, parts[0], parts[1], sid)
			break
		}
	}

	return utils.Clone(swimmer), url
}

// FindName search the swimmer's alias and name
func FindName(name string) []string {
	mutex.RLock()
	defer mutex.RUnlock()
	data := &mainData

	name = strings.ToLower(strings.TrimSpace(name))
	matchName := func(recordName string) bool {
		recordName = strings.ToLower(recordName)
		parts := strings.Split(recordName, " ")
		parts = append(parts, recordName)
		for _, part := range parts {
			if strings.Index(part, name) == 0 {
				return true
			}
		}
		return false
	}

	result := make([]string, 0, 1)

	for _, lsc := range data.Swimmers {
		for sid, swimmer := range lsc.Swimmers {
			if matchName(swimmer.Alias) || matchName(swimmer.Name) {
				result = append(result, sid)
			}
		}
	}
	return result
}

// AddSwimmer create the swimmer basic info
func AddSwimmer(lscId, lscName, sid, name, gender, team string, age int) {
	mutex.Lock()
	defer mutex.Unlock()
	data := &mainData

	dlsc, ok := data.Swimmers[lscId]
	if !ok {
		dlsc = &Lsc{LSC: lscName, Swimmers: map[string]*Swimmer{}}
		data.Swimmers[lscId] = dlsc
	}

	swimmer, ok := dlsc.Swimmers[sid]
	if !ok {
		swimmer = &Swimmer{}
	}

	if swimmer.LCM == nil {
		swimmer.LCM = Stroke{}
	}
	if swimmer.SCY == nil {
		swimmer.SCY = Stroke{}
	}

	dlsc.Swimmers[sid] = swimmer
	swimmer.ID = sid
	swimmer.Name = name
	swimmer.Gender = gender
	swimmer.Team = strings.TrimSpace(team)
	swimmer.Age = age
	swimmer.Update = time.Now()
}

func UpdateSwimmer(sid string, swimmer *Swimmer) {
	swimmer = utils.Clone(swimmer)

	mutex.Lock()
	defer mutex.Unlock()
	data := &mainData

	for _, lsc := range data.Swimmers {
		if _, ok := lsc.Swimmers[sid]; ok {
			lsc.Swimmers[sid] = swimmer
			break
		}
	}
}

func UpdateRankings(sid string, rankings *[]Rankings) {
	rankings = utils.Clone(rankings)

	mutex.Lock()
	defer mutex.Unlock()
	data := &mainData

	swimmer := findSwimmer(sid, data)
	swimmer.Rankings = *rankings
}

func AddEvent(sid, course, stroke string, length int, event *Event) {
	event = utils.Clone(event)

	mutex.Lock()
	defer mutex.Unlock()
	data := &mainData

	swimmer := findSwimmer(sid, data)

	strokes := swimmer.SCY
	if strings.EqualFold(LCM, course) {
		strokes = swimmer.LCM
	}

	if shorter, ok := StrokeMapping[stroke]; ok {
		stroke = shorter
	} else {
		utils.LogError(fmt.Errorf("invalid stroke: [%s]", stroke))
	}

	lengths, ok := strokes[stroke]
	if !ok {
		lengths = &Length{}
		strokes[stroke] = lengths
	}

	events, ok := (*lengths)[length]
	if !ok {
		events = []*Event{}
	} else {
		for _, ent := range events {
			if ent.Date == event.Date && ent.Time == event.Time {
				return
			}
		}
	}

	events = append(events, event)

	sort.Slice(events, func(i, j int) bool {
		return events[i].Date.After(events[j].Date) ||
			events[i].Date == events[j].Date && events[i].Time < events[j].Time
	})

	(*lengths)[length] = events
}

func findSwimmer(sid string, data *Data) *Swimmer {
	var swimmer *Swimmer
	for _, lsc := range data.Swimmers {
		if s, ok := lsc.Swimmers[sid]; ok {
			swimmer = s
			break
		}
	}
	return swimmer
}

func (s *Swimmer) ForEachEvent(call func(course, stroke string, length int, event *Event)) {
	for _, st := range filterStrokeKeys(s.SCY) {
		strokes := *s.SCY[st]
		for _, l := range utils.SortedKeys(strokes) {
			for _, event := range (strokes)[l] {
				call(SCY, st, l, event)
			}
		}
	}
	for _, st := range filterStrokeKeys(s.LCM) {
		strokes := *s.LCM[st]
		for _, l := range utils.SortedKeys(strokes) {
			for _, event := range (strokes)[l] {
				call(LCM, st, l, event)
			}
		}
	}
}

func (s *Swimmer) GetBirthday() (time.Time, time.Time) {
	left, _ := time.Parse("1/2/2006", "1/1/1900")
	right := time.Now()

	s.ForEachEvent(func(course, stroke string, length int, event *Event) {
		right = timeMin(event.Date.AddDate(-event.Age, 0, 0), right)
		left = timeMax(event.Date.AddDate(-event.Age-1, 0, 1), left)
	})

	if s.Birthday != nil {
		if left.Add(-24*time.Hour).Before(*s.Birthday) &&
			right.Add(24*time.Hour).After(*s.Birthday) {
			right = *s.Birthday
			left = right
		} else {
			utils.LogError(fmt.Errorf("Wrong B-day SID=%s Bday=%s Left=%s Right=%s",
				s.ID, s.Birthday.Format("2006/01/02"), left.Format("2006/01/02"), right.Format("2006/01/02")))
		}
	}

	return left, right
}

func (s *Swimmer) GetEventCount() int {
	cnt := 0
	for _, stroke := range s.SCY {
		for _, length := range *stroke {
			cnt += len(length)
		}
	}
	for _, stroke := range s.LCM {
		for _, length := range *stroke {
			cnt += len(length)
		}
	}

	return cnt
}

func (s *Swimmer) GetBestEvent(course, stroke string, length int) *Event {
	events := s.GetEvents(course, stroke, length)
	if len(events) == 0 {
		return nil
	}
	best := events[0]
	for _, e := range events {
		if e.Time < best.Time {
			best = e
		}
	}
	return best
}

func (s *Swimmer) GetEvents(course, stroke string, length int) []*Event {
	strokes := s.SCY
	if course == LCM {
		strokes = s.LCM
	}
	lengthes := strokes[stroke]
	if lengthes == nil {
		return nil
	}
	return (*lengthes)[length]
}

func (s *Swimmer) GetDelta(course, stroke string, length int, event *Event) string {
	events := s.GetEvents(course, stroke, length)

	var fast *Event
	for i := len(events) - 1; i >= 0; i-- {
		e := events[i]
		if e == event {
			etime := e.Time
			if fast == nil {
				return ""
			} else {
				return utils.CalculateSwimTimeDelta(etime, fast.Time)
			}
		} else if fast == nil || fast.Time > e.Time && e.Date != event.Date {
			fast = e
		}
	}

	return ""
}

func GetSettings() *Settings {
	mutex.RLock()
	defer mutex.RUnlock()
	data := &mainData

	return utils.Clone(&data.Settings)
}

func SetSettings(settings *Settings) {
	settings = utils.Clone(settings)

	mutex.Lock()
	defer mutex.Unlock()
	data := &mainData

	data.Settings = *settings
}

func filterStrokeKeys(strokes Stroke) []string {
	allStrokes := []string{Free, Back, Breast, Fly, IM}
	keys := make([]string, 0, len(allStrokes))
	for _, key := range allStrokes {
		if _, ok := strokes[key]; ok {
			keys = append(keys, key)
		}
	}
	return keys
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

func DataMigration() {
	//for _, lsc := range mainData.Swimmers {
	//	var bad []string
	//	for sid, swimmer := range lsc.Swimmers {
	//		if swimmer.Age == 0 {
	//			bad = append(bad, sid)
	//		}
	//	}
	//	for _, sid := range bad {
	//		delete(lsc.Swimmers, sid)
	//		utils.Log("Deleted " + sid + "\n")
	//	}
	//}
	//
	//var bad []string
	//for path, lsc := range mainData.Swimmers {
	//	if len(lsc.Swimmers) == 0 {
	//		bad = append(bad, path)
	//	}
	//}
	//
	//for _, path := range bad {
	//	delete(mainData.Swimmers, path)
	//	utils.Log("Deleted " + path + "\n")
	//}
}
