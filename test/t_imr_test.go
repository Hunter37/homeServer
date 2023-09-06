package test

import (
	"bufio"
	"fmt"
	"strconv"
	"strings"
	"testing"
)

func TestFindIMRelayPlayer(t *testing.T) {

	//	text := `
	//1	Noah Arthiabah	10	Bellevue Club Swim Te	36.48	6/24/23	PN MET Cannonba
	//2	Jacob Yeung	10	Bellevue Club Swim Te	39.14	6/24/23	PN MET Cannonba
	//3	Luke Han	10	Bellevue Club Swim Te	39.27	6/24/23	PN MET Cannonba
	//4	Yichen Fei	9	Bellevue Club Swim Te	43.22	5/05/23	PN BC May Flow
	//,,,,,,
	//1	Noah Arthiabah	10	Bellevue Club Swim Te	43.79	6/02/23	IE VS Apple Cap
	//2	Luke Han	10	Bellevue Club Swim Te	47.13	6/24/23	PN MET Cannonba
	//3	Alexander Han	9	Bellevue Club Swim Te	47.15	5/05/23	PN BC May Flow
	//4	Zegen Brink	9	Bellevue Club Swim Te	50.00	5/05/23	PN BC May Flow
	//,,,,,,
	//1	Noah Arthiabah	10	Bellevue Club Swim Te	34.83	6/02/23	IE VS Apple Cap
	//2	Jacob Yeung	10	Bellevue Club Swim Te	39.19	6/24/23	PN MET Cannonba
	//3	David Xin	10	Bellevue Club Swim Te	42.90	5/05/23	PN BC May Flow
	//4	Alexander Han	9	Bellevue Club Swim Te	42.98	6/02/23	IE VS Apple Cap
	//,,,,,,
	//1	Noah Arthiabah	10	Bellevue Club Swim Te	30.73	6/24/23	PN MET Cannonba
	//2	Luke Han	10	Bellevue Club Swim Te	34.41	5/05/23	PN BC May Flow
	//3	Jacob Yeung	10	Bellevue Club Swim Te	34.88	5/05/23	PN BC May Flow
	//4	Yichen Fei	9	Bellevue Club Swim Te	35.65	6/24/23	PN MET Cannonba
	//`
	// 2.66   3.34    4.36    3.68

	text := `
7	Evan Mok	10	Pacific Dragons Swim	39.32	5/05/23	CAN West Coast

8	Muyuan Zhu	10	Pacific Dragons Swim	39.70	6/24/23	PN MET Cannonba

11	Marcus Chen	9	Pacific Dragons Swim	40.40	6/24/23	PN MET Cannonba

12	Michael Zhang	10	Pacific Dragons Swim	40.43	6/03/23	PN VAST Summer
`

	data := make([][][]string, 0)

	scanner := bufio.NewScanner(strings.NewReader(text))
	for scanner.Scan() {
		line := scanner.Text()
		if len(line) < 20 {
			data = append(data, make([][]string, 0))
		} else {
			group := len(data) - 1
			data[group] = append(data[group], strings.Split(line, "\t"))
		}
	}

	bestTime = 1549900

	used := map[string]bool{}
	choice := []int{-1, -1, -1, -1}
	dfs(data, used, 0, choice, 0)

	fmt.Printf("\n%s%d.%d\n\n\n", best, bestTime/100, bestTime%100)
}

var best string
var bestTime int

func dfs(data [][][]string, used map[string]bool, style int, choice []int, time int) {
	if time >= bestTime {
		return
	}

	if style == 4 {
		bestTime = time
		best = ""
		for i := 0; i < 4; i++ {
			best += strings.Join(data[i][choice[i]], "\t") + "\n"
		}
		return
	}

	group := data[style]
	for i := 0; i < len(group); i++ {
		swimmer := group[i]
		if _, found := used[swimmer[1]]; !found {
			used[swimmer[1]] = true
			choice[style] = i
			dfs(data, used, style+1, choice, time+getTime(swimmer[4]))
			delete(used, swimmer[1])
		}
	}
}

func getTime(t string) int {
	p := strings.Split(t, ".")
	s, _ := strconv.Atoi(p[0])
	m, _ := strconv.Atoi(p[1])
	return s*100 + m
}
