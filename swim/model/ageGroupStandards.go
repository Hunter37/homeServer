package model

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"homeServer/utils"
)

var (
	meetStandards map[string]map[string]int
	// key1 := meet name
	// key2 := gender | age | course | stroke | length
	// value := time int
)

func GetAgeGroupMeetStandard(meet, gender string, age int, course, stroke string, length int) int {
	if meetStandards == nil {
		loadAgeGroupStandards("ageGroupTimeStandards.json")
	} else if _, ok := meetStandards[meet]; !ok {
		loadAgeGroupStandards("ageGroupTimeStandards.json")
	}

	if standard, ok := meetStandards[meet]; ok {
		key := fmt.Sprint(gender, age, course, stroke, length)
		if time, ok := standard[key]; ok {
			return time
		}
	}
	return -1
}

func loadAgeGroupStandards(file string) {
	meetStandards = make(map[string]map[string]int)

	listFile, err := os.Open(file)
	if err != nil {
		utils.LogError(err, "list file read failed!")
		return
	}

	scanner := bufio.NewScanner(listFile)
	scanner.Split(bufio.ScanLines)
	var ages [][]int
	var course string
	var meetStds = make(map[string]int)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if len(line) == 0 || strings.Index(line, "//") == 0 {
			continue
		}

		// meet name
		if strings.Index(line, "---") == 0 {
			meetStds = make(map[string]int)
			meetStandards[line[3:]] = meetStds
			continue
		}

		parts := strings.Split(line, " ")

		// course and age line
		if _, ok := map[string]int{"SCY": 0, "SCM": 0, "LCM": 0}[parts[0]]; ok {
			course = parts[0]
			ages = make([][]int, 0)
			for i := 1; i < len(parts); i++ {
				ageStrs := strings.Split(parts[i], "-")
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
			continue
		}

		if len(parts) != 2+2*len(ages) {
			utils.LogError(fmt.Errorf("wrong line"), line)
			continue
		}

		stroke := parts[len(ages)+1]
		length := parts[len(ages)]

		convert := func(s []string) []int {
			return utils.Convert(s, func(s string) int {
				if s == "-" {
					return -1
				}
				return utils.ParseSwimTime(s)
			})
		}
		girlTimes := convert(parts[:len(ages)])
		boyTimes := convert(utils.Reverse(parts)[:len(ages)])
		for i, age := range ages {
			for _, a := range age {
				meetStds[fmt.Sprint("Female", a, course, stroke, length)] = girlTimes[i]
				meetStds[fmt.Sprint("Male", a, course, stroke, length)] = boyTimes[i]
			}
		}
	}
}
