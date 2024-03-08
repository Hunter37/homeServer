package model

import (
	"encoding/json"
	
	"homeServer/storage"
	"homeServer/utils"
)

const (
	settingsFile = "data/settings.json"
)

type ModeType string

const (
	ONLINE  ModeType = "online"
	CACHE   ModeType = "cache"
	OFFLINE ModeType = "offline"
)

type Settings struct {
	SearchMode         ModeType `json:",omitempty"`
	Standards          []string `json:",omitempty"`
	CacheTimeInMinutes int      `json:",omitempty"`
}

var (
	_settings = Settings{}
)

func LoadSettings() error {
	b, err := storage.File.Read(settingsFile)
	if err != nil {
		return err
	}

	return json.Unmarshal(b, &_settings)
}

func GetSettings() *Settings {
	return &_settings
}

func SetSettings(settings *Settings) {
	_settings = *settings

	jsonStr, err := json.Marshal(_settings)
	if err != nil {
		utils.LogError(err, "Settings save failed!")
	}
	storage.File.Write(settingsFile, jsonStr)
}
