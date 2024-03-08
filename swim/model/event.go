package model

import (
	"encoding/json"
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
