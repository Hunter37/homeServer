package model

import (
	"runtime"
	"testing"
	"path/filepath"

	"homeServer/test"
)

func TestLoadMeetStandards(t *testing.T) {
	_, filename, _, _ := runtime.Caller(0)
    t.Logf("Current test filename: %s", filename)
	dir := filepath.Dir(filename)
	path := filepath.Join(dir, "../../data/meetStandards.json")
	meetStandards, err := loadMeetStandards(path)
	test.NoError(t, err)

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

	test.Equal(t, meetStandards["SprSec"]["Male13LCMFree1500"], 174559)
	test.Equal(t, meetStandards["SprSec"]["Male13SCYFree1650"], 171316)
	test.Equal(t, meetStandards["SprSec"]["Female13LCMFree400"], 44321)
	test.Equal(t, meetStandards["SprSec"]["Female13SCYFree500"], 51317)
}
