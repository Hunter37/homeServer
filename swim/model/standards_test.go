package model

import (
	"fmt"
	"testing"

	"homeServer/test"
	"homeServer/utils"
)

func TestBuildMotivateTimes(t *testing.T) {
	// gender | age | course | stroke | length [AAAA, AAA, AA, A, BB, B]
	standards := getMotivationalTimes("../../2021-2024AgeGroupMotivationTimes.txt")

	utils.Log(fmt.Sprint(len(standards)))
}

func TestLoadAgeGroupStandards(t *testing.T) {
	loadAgeGroupStandards("../../ageGroupTimeStandards.json")

	test.Equal(t, meetStandards["ShowD"]["Female15SCYFree50"], 2889)
	test.Equal(t, meetStandards["ShowD"]["Female16SCYFree50"], 2889)
	test.Equal(t, meetStandards["ShowD"]["Female17SCYFree50"], 2889)
	test.Equal(t, meetStandards["ShowD"]["Female18SCYFree50"], 2889)
	test.Equal(t, meetStandards["ShowD"]["Female14SCYFree50"], 2929)
	test.Equal(t, meetStandards["ShowD"]["Female15LCMFree50"], 3269)
	test.Equal(t, meetStandards["ShowD"]["Female16LCMFree50"], 3269)
	test.Equal(t, meetStandards["ShowD"]["Female17LCMFree50"], 3269)
	test.Equal(t, meetStandards["ShowD"]["Female18LCMFree50"], 3269)
	test.Equal(t, meetStandards["ShowD"]["Female14LCMFree50"], 3319)
}

func TestForNilSlice(t *testing.T) {
	var nilSlice []string
	for _, s := range nilSlice {
		fmt.Println(s)
	}
}

//func TestDateMigration(t *testing.T) {
//	by, _ := os.ReadFile("../../ageGroupTimeStandards.json")
//	lines := strings.Split(string(by), "\n")
//	result := ""
//	for _, line := range lines {
//		parts := strings.Split(line, " ")
//		if len(parts) == 8 {
//			result += fmt.Sprintf("%s %s %s %s %s %s %s %s\n", parts[2], parts[1], parts[0], parts[3], parts[4], parts[5], parts[6], parts[7])
//		} else {
//			result += line + "\n"
//		}
//	}
//	os.WriteFile("../../ageGroupTimeStandards1.json", []byte(result), 0o600)
//}
