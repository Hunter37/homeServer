package swim

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"sort"
	"strings"
	"time"

	"homeServer/utils"
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
		Time:         formatSwimTime(e.Time),
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

	e.Time = parseSwimTime(aux.Time)

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
	Alias    string     `json:",omitempty"`
	Gender   string     `json:",omitempty"`
	Team     string     `json:",omitempty"`
	Age      int        `json:",omitempty"`
	Birthday *time.Time `json:",omitempty"`
	SCY      Stroke     `json:",omitempty"`
	LCM      Stroke     `json:",omitempty"`
	Rankings []Rankings `json:",omitempty"`
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

type Data map[string]*Lsc

var data = Data{}

func init() {
	data.Load()
}

func CleanUp() {
	data.Save()
}

func (d *Data) Save() error {
	if str, err := json.Marshal(d); err != nil {
		return err
	} else {
		return os.WriteFile("data.json", str, 0o600)
	}
}

func (d *Data) Load() error {
	if str, err := os.ReadFile("data.json"); err != nil {
		return err
	} else {
		return json.Unmarshal(str, d)
	}
}

func (d *Data) AddSwimmer(lscId, lscName, sid, name, gender, team string, age int) *Swimmer {
	dlsc, ok := data[lscId]
	if !ok {
		dlsc = &Lsc{LSC: lscName, Swimmers: map[string]*Swimmer{}}
		data[lscId] = dlsc
	}

	swimmer, ok := dlsc.Swimmers[sid]
	if !ok {
		swimmer = &Swimmer{
			LCM: map[string]*Length{},
			SCY: map[string]*Length{},
		}
	}

	dlsc.Swimmers[sid] = swimmer
	swimmer.ID = sid
	swimmer.Name = name
	swimmer.Gender = gender
	swimmer.Team = team
	swimmer.Age = age

	return swimmer
}

func (swimmer *Swimmer) AddEvent(course, stroke string, length int, event *Event) {
	strokes := swimmer.SCY
	if strings.EqualFold("LCM", course) {
		strokes = swimmer.LCM
	}

	strokeMapping := map[string]string{
		"Freestyle":         Free,
		"Backstroke":        Back,
		"Breaststroke":      Breast,
		"Breaststoke":       Breast, // workaround for the typo "Breaststoke"
		"Butterfly":         Fly,
		"Individual Medley": IM,
	}
	if shorter, ok := strokeMapping[stroke]; ok {
		stroke = shorter
	} else {
		utils.LogError(errors.New("invalid stroke: [" + stroke + "]"))
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

func (d *Data) Find(id string) *Swimmer {
	for _, lsc := range *d {
		if swimmer, ok := lsc.Swimmers[id]; ok {
			return swimmer
		}
	}
	return nil
}

func (s *Swimmer) ForEachEvent(call func(course, stroke string, length int, event *Event)) {
	for _, st := range filterStrokeKeys(s.SCY) {
		strokes := *s.SCY[st]
		for _, l := range sortedKeys(strokes) {
			for _, event := range (strokes)[l] {
				call("SCY", st, l, event)
			}
		}
	}
	for _, st := range filterStrokeKeys(s.LCM) {
		strokes := *s.LCM[st]
		for _, l := range sortedKeys(strokes) {
			for _, event := range (strokes)[l] {
				call("LCM", st, l, event)
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
			utils.LogError(errors.New(fmt.Sprintf("Wrong B-day SID=%s Bday=%s Left=%s Right=%s",
				s.ID, s.Birthday.Format("2006/01/02"), left.Format("2006/01/02"), right.Format("2006/01/02"))))
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
	if course == "LCM" {
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

	// todo : remove this?
	sort.Slice(events, func(i, j int) bool {
		return events[i].Date.After(events[j].Date) ||
			events[i].Date == events[j].Date && events[i].Time < events[j].Time
	})

	var fast *Event
	for i := len(events) - 1; i >= 0; i-- {
		e := events[i]
		if e == event {
			if fast == nil {
				return ""
			} else {
				a := e.Time
				b := fast.Time
				a = a/10000*6000 + a%10000
				b = b/10000*6000 + b%10000
				d := a - b
				sign := "+"
				if d == 0 {
					return "0"
				} else if d < 0 {
					sign = "-"
					d = -d
				}
				d = d/6000*10000 + d%6000
				return fmt.Sprint(sign, formatSwimTime(d))
			}
		} else if fast == nil || fast.Time > e.Time && e.Date != event.Date {
			fast = e
		}
	}

	return ""
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
