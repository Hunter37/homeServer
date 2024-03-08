package model

import (
	"strings"
	"time"

	"homeServer/regex"
)

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

func LoadTopList(url string) (*TopList, error) {
	pkey, rkey := getToplistKey(url)
	toplist, err := GetTableObject[TopList](toplistTable, pkey, rkey)
	return toplist, err
}

func SaveTopList(url string, toplist *TopList) error {
	pkey, rkey := getToplistKey(url)
	return SaveTableObject[TopList](toplistTable, pkey, rkey, toplist)
}

func getToplistKey(url string) (string, string) {
	m := regex.MatchRow(url, `https://[^/]+/(.+/.+)/(.+)\.html`, []int{1, 2})
	return strings.ReplaceAll(m[0], "/", "|"), m[1]
}
