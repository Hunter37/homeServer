package model

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"homeServer/utils"
)

const (
	SCY    = "SCY"
	SCM    = "SCM"
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
		Free:                Free,
		"Freestyle":         Free,
		Back:                Back,
		"Backstroke":        Back,
		Breast:              Breast,
		"Breaststroke":      Breast,
		Fly:                 Fly,
		"Butterfly":         Fly,
		IM:                  IM,
		"Individual Medley": IM,
	}

	courseSet = map[string]int{SCY: 0, SCM: 1, LCM: 2}
)

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
	LscID    string     `json:",omitempty"`
	ID       string     `json:",omitempty"`
	Name     string     `json:",omitempty"`
	Middle   string     `json:",omitempty"`
	Alias    string     `json:",omitempty"`
	Gender   string     `json:",omitempty"`
	Team     string     `json:",omitempty"`
	LSC      string     `json:",omitempty"`
	Age      int        `json:",omitempty"`
	Birthday *time.Time `json:",omitempty"`
	SCY      Stroke     `json:",omitempty"`
	LCM      Stroke     `json:",omitempty"`
	Rankings []Rankings `json:",omitempty"`

	Update  time.Time `json:",omitempty"`
	Invalid bool      `json:",omitempty"`
}

func (s Swimmer) MarshalJSON() ([]byte, error) {
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
		SwimmerWrapper: (*SwimmerWrapper)(&s),
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

func (s *Swimmer) GetMeetUrl() string {
	parts := strings.Split(s.LscID, "|")
	return fmt.Sprintf(`https://www.swimmingrank.com/%s/strokes/strokes_%s/%s_meets.html`, parts[0], parts[1], s.ID)
}

func (s *Swimmer) AddEvent(course, stroke string, length int, event *Event) {

	var strokes Stroke
	if strings.EqualFold(LCM, course) {
		if s.LCM == nil {
			s.LCM = Stroke{}
		}
		strokes = s.LCM
	} else {
		if s.SCY == nil {
			s.SCY = Stroke{}
		}
		strokes = s.SCY
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
			utils.LogError(fmt.Errorf("wrong B-day SID=%s Bday=%s Left=%s Right=%s",
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
	var best *Event
	for _, e := range events {
		if (best == nil || e.Time < best.Time) && !e.Invalid {
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
