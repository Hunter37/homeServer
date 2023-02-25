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

	test.Equal(t, meetStandards["SPRING SHOWDOWN"]["Female15SCYFree50"], 2889)
	test.Equal(t, meetStandards["SPRING SHOWDOWN"]["Female16SCYFree50"], 2889)
	test.Equal(t, meetStandards["SPRING SHOWDOWN"]["Female17SCYFree50"], 2889)
	test.Equal(t, meetStandards["SPRING SHOWDOWN"]["Female18SCYFree50"], 2889)
	test.Equal(t, meetStandards["SPRING SHOWDOWN"]["Female14SCYFree50"], 2929)
	test.Equal(t, meetStandards["SPRING SHOWDOWN"]["Female15LCMFree50"], 3269)
	test.Equal(t, meetStandards["SPRING SHOWDOWN"]["Female16LCMFree50"], 3269)
	test.Equal(t, meetStandards["SPRING SHOWDOWN"]["Female17LCMFree50"], 3269)
	test.Equal(t, meetStandards["SPRING SHOWDOWN"]["Female18LCMFree50"], 3269)
	test.Equal(t, meetStandards["SPRING SHOWDOWN"]["Female14LCMFree50"], 3319)
}

func TestForNilSlice(t *testing.T) {
	var nilSlice []string
	for _, s := range nilSlice {
		fmt.Println(s)
	}
}
