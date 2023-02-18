package model

type ModeType string

const (
	ONLINE  ModeType = "online"
	CACHE   ModeType = "cache"
	OFFLINE ModeType = "offline"
)

type Settings struct {
	SearchMode ModeType
}
