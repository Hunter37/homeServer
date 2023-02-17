package regex

import (
	"regexp"
	"strings"

	"homeServer/utils"
)

func MatchTable(body, exp string, index []int) [][]string {
	matches := regexp.MustCompile(exp).FindAllStringSubmatch(body, -1)
	result := make([][]string, 0, len(matches))
	for _, m := range matches {
		item := make([]string, 0, len(index))
		for _, i := range index {
			item = append(item, m[i])
		}
		result = append(result, item)
	}
	return result
}

func MatchOne(body, exp string, index int) string {
	match := regexp.MustCompile(exp).FindStringSubmatch(body)
	if len(match) <= index {
		return ""
	}
	return match[index]
}

func MatchRow(body, exp string, index []int) []string {
	matches := regexp.MustCompile(exp).FindStringSubmatch(body)
	result := make([]string, 0, len(matches))
	if matches != nil {
		for _, i := range index {
			result = append(result, matches[i])
		}
	}
	return result
}

func MatchColumn(body, exp string, index int) []string {
	matches := regexp.MustCompile(exp).FindAllStringSubmatch(body, -1)
	return utils.GetColumn(matches, index)
}

func FindInnerPart(body, begin, end string) string {
	b := strings.Index(body, begin)
	if b < 0 {
		return ""
	}
	body = body[b+len(begin):]
	e := strings.Index(body, end)
	if e < 0 {
		return ""
	}
	return body[:e]
}

func FindPart(body, begin, end string) string {
	b := strings.Index(body, begin)
	if b < 0 {
		return ""
	}
	body = body[b:]
	e := strings.Index(body, end)
	if e < 0 {
		return ""
	}
	return body[:e+len(end)]
}

func FindPartList(body, begin, end string) []string {
	result := make([]string, 0)
	for {
		b := strings.Index(body, begin)
		if b < 0 {
			break
		}
		body = body[b:]
		e := strings.Index(body, end)
		if e < 0 {
			break
		}

		result = append(result, body[:e+len(end)])

		body = body[e+len(end):]
	}

	return result
}
