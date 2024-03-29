package model

import (
	"bufio"
	"bytes"
	"fmt"
	"strings"

	"homeServer/storage"
	"homeServer/utils"
)

var (
	meetStandards map[string]map[string]int
	// key1 := meet name
	// key2 := gender | age | course | stroke | length
	// value := time int

	meterToYardMapping = map[int]int{400: 500, 800: 1000, 1500: 1650}
)

func GetMeetStandard(meet, gender string, age int, course, stroke string, length int) int {
	var err error

	if meetStandards == nil {
		meetStandards, err = loadMeetStandards("data/meetStandards.json")
		utils.LogError(err)
	} else if _, ok := meetStandards[meet]; !ok {
		meetStandards, err = loadMeetStandards("data/meetStandards.json")
		utils.LogError(err)
	}

	if standard, ok := meetStandards[meet]; ok {
		key := fmt.Sprint(gender, age, course, stroke, length)
		if time, ok := standard[key]; ok {
			return time
		}
	}
	return -1
}

func loadMeetStandards(file string) (map[string]map[string]int, error) {
	standards := make(map[string]map[string]int)

	b, err := storage.File.Read(file)
	if err != nil {
		utils.LogError(err, "list file read failed!")
		return standards, err
	}

	scanner := bufio.NewScanner(bytes.NewBuffer(b))
	scanner.Split(bufio.ScanLines)
	var ages [][]int
	var courses []string
	var meetStds = make(map[string]int)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if len(line) == 0 || strings.Index(line, "//") == 0 {
			continue
		}

		// meet name
		if strings.Index(line, "meet:") == 0 {
			meetStds = make(map[string]int)
			standards[strings.TrimSpace(line[5:])] = meetStds
			continue
		}

		line = strings.ReplaceAll(line, "\t", " ")
		parts := strings.Split(line, " ")

		// course and age line
		if _, ok := courseSet[parts[0]]; ok {
			courses = make([]string, 0, len(parts)-1)
			ages = make([][]int, 0, len(parts)-1)
			for _, p := range parts {
				if _, ok := courseSet[p]; ok {
					courses = append(courses, p)
				} else {
					ageStrs := strings.Split(p, "-")
					if len(ageStrs) == 2 {
						left := utils.ParseInt(ageStrs[0])
						right := utils.ParseInt(ageStrs[1])
						a := make([]int, 0, right-left+1)
						for j := left; j <= right; j++ {
							a = append(a, j)
						}
						ages = append(ages, a)
					} else {
						ages = append(ages, []int{utils.ParseInt(ageStrs[0])})
					}
				}
			}

			continue
		}

		valueCount := len(ages) * len(courses)

		if len(parts) != 2+2*valueCount {
			err = fmt.Errorf("wrong line")
			utils.LogError(err, line)
			return standards, err
		}

		stroke := parts[valueCount+1]
		length := utils.ParseInt(parts[valueCount])

		convert := func(s []string) []int {
			return utils.Convert(s, func(s string) int {
				if s == "-" {
					return -1
				}
				return utils.ParseSwimTime(s)
			})
		}
		girlTimes := convert(parts[:valueCount])
		boyTimes := convert(utils.Reverse(parts)[:valueCount])

		for i, course := range courses {
			clen := length
			if course == SCY && stroke == Free {
				if l, ok := meterToYardMapping[length]; ok {
					clen = l
				}
			}

			for j, age := range ages {
				index := i*len(ages) + j
				gTime := girlTimes[index]
				bTime := boyTimes[index]
				for _, a := range age {
					meetStds[fmt.Sprint(Female, a, course, stroke, clen)] = gTime
					meetStds[fmt.Sprint(Male, a, course, stroke, clen)] = bTime
				}
			}
		}
	}

	return standards, nil
}
