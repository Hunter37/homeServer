package model

import (
	"fmt"
	"testing"

	"homeServer/utils"
)

func TestLoadMotivateTimes(t *testing.T) {
	// gender | age | course | stroke | length [AAAA, AAA, AA, A, BB, B]
	stds := loadMotivationalTimes("../../data/2021-2024AgeGroupMotivationTimes.json")

	utils.Log(fmt.Sprint(len(stds)))
}
