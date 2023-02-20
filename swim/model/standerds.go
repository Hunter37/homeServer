package model

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"

	"homeServer/utils"
)

var (
	standards map[string][]int

	stdmap = map[int]string{
		0: "B",
		1: "BB",
		2: "A",
		3: "AA",
		4: "AAA",
		5: "AAAA",
	}
)

func GetStandards(gender string, age int, course, stroke string, length int) []int {
	if len(standards) == 0 {
		standards = getMotivationalTimes("2021-2024AgeGroupMotivationTimes.txt")
	}

	if age < 10 {
		age = 10
	} else if age%2 == 1 {
		age += 1
	}
	key := fmt.Sprint(gender, age, course, stroke, length)
	return standards[key]
}

func GetStandard(gender string, age int, course, stroke string, length, time int) string {
	var std string
	times := GetStandards(gender, age, course, stroke, length)
	for i, t := range times {
		if time <= t {
			std = stdmap[i]
		} else {
			break
		}
	}

	return std
}

func getMotivationalTimes(file string) map[string][]int {
	// gender | age | course | stroke | length [B, BB, A, AA, AAA, AAAA]
	standards := make(map[string][]int)

	listFile, err := os.Open(file)
	if err != nil {
		utils.LogError(err, "list file read failed!")
		return nil
	}

	scanner := bufio.NewScanner(listFile)
	scanner.Split(bufio.ScanLines)
	var age int
	var course string
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if len(line) == 0 || strings.Index(line, "//") == 0 {
			continue
		}
		line = strings.ReplaceAll(line, " *", "")

		if _, ok := map[string]int{"SCY": 0, "SCM": 0, "LCM": 0}[line]; ok {
			course = line
			continue
		}

		parts := strings.Split(line, " ")
		if len(parts) == 1 {
			age, err = strconv.Atoi(line)
			if err != nil {
				utils.LogError(err, "parse age error: "+line)
			}
			continue
		}

		if len(parts) != 15 {
			utils.LogError(fmt.Errorf("wrong line"), line)
			continue
		}

		stroke := parts[8]
		length := parts[6]

		convert := func(s []string) []int {
			return utils.Convert(s, func(s string) int {
				return utils.ParseSwimTime(s)
			})
		}
		standards[fmt.Sprint("Female", age, course, stroke, length)] =
			convert(parts[0:6])

		standards[fmt.Sprint("Male", age, course, stroke, length)] =
			convert(utils.Reverse[string](parts[9:15]))
	}

	return standards
}
