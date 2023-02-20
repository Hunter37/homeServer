package model

import (
	"fmt"
	"testing"

	"homeServer/utils"
)

func TestBuildMotivateTimes(t *testing.T) {
	// gender | age | course | stroke | length [AAAA, AAA, AA, A, BB, B]
	standards := getMotivationalTimes("../../2021-2024AgeGroupMotivationTimes.txt")

	utils.Log(fmt.Sprint(len(standards)))
}
