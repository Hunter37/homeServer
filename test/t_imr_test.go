package test

import (
	"bufio"
	"fmt"
	"strconv"
	"strings"
	"testing"
)

func TestFindIMRelayPlayer(t *testing.T) {
	text := `
1	Marcus Chen	39.09	6/01/24	10	2013/11/14	PN	Pacific Dragons Swim	PN VAST Summer
2	Andy Wu	39.53	6/01/24	10	2014/06/19	PN	Pacific Dragons Swim	PN VAST Summer
3	Aiden Dong	43.30	6/01/24	9	2014/09/14	PN	Pacific Dragons Swim	PN VAST Summer
4	Eric Yu	43.86	5/17/24	10	2014/03/03 - 03/21	PN	Pacific Dragons Swim	PN IST Sockeye
														
1	Marcus Chen	44.09	6/28/24	10	2013/11/14	PN	Pacific Dragons Swim	PN SMAC Summer
2	Alex Wang	45.83	6/28/24	10	2013/08/14	PN	Pacific Dragons Swim	PN SMAC Summer
3	Aiden Dong	47.40	6/28/24	9	2014/09/14	PN	Pacific Dragons Swim	PN SMAC Summer
4	Eric Yu	48.92	6/28/24	10	2014/03/03 - 03/21	PN	Pacific Dragons Swim	PN SMAC Summer
											
1	Alex Wang	35.52	6/01/24	10	2013/08/14	PN	Pacific Dragons Swim	PN VAST Summer
2	Marcus Chen	38.63	6/01/24	10	2013/11/14	PN	Pacific Dragons Swim	PN VAST Summer
3	Aiden Dong	40.48	6/28/24	9	2014/09/14	PN	Pacific Dragons Swim	PN SMAC Summer
4	Eric Yu	46.84	6/28/24	10	2014/03/03 - 03/21	PN	Pacific Dragons Swim	PN SMAC Summer
															
1	Alex Wang	34.40	6/01/24	10	2013/08/14	PN	Pacific Dragons Swim	PN VAST Summer
2	Aiden Dong	34.95	6/28/24	9	2014/09/14	PN	Pacific Dragons Swim	PN SMAC Summer
3	Marcus Chen	35.53	6/01/24	10	2013/11/14	PN	Pacific Dragons Swim	PN VAST Summer
4	Andy Wu	36.35	6/15/24	10	2014/06/19	PN	Pacific Dragons Swim	PN UPAC Cannonb
`

	data := make([][][]string, 0)
	result := "\n"

	scanner := bufio.NewScanner(strings.NewReader(text))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if len(line) < 20 {
			data = append(data, make([][]string, 0))
		} else {
			group := len(data) - 1
			data[group] = append(data[group], strings.Split(line, "\t"))
		}
	}
	free := data[0]

	if len(data) >= 4 {
		free = data[3]

		inGroup := map[string]bool{}
		used := map[string]bool{}

		for i := 0; i < len(data[0]); i++ {
			bestTime = 600000
			choice := []int{-1, -1, -1, -1}

			dfs(data, used, inGroup, 0, choice, 0)

			if bestTime == 600000 {
				break
			}

			result += fmt.Sprintf("MR %d\n%s%d:%02d.%02d\n\n", i+1, best, bestTime/100/60, bestTime/100%60, bestTime%100)

			for k := range inGroup {
				used[k] = true
			}
		}
	}

	i := 0
	end := 4
	for end <= len(free) {
		bestTime = 0

		result += fmt.Sprintf("FR %d\n", (i+1)/4+1)
		for ; i < end; i++ {
			result += fmt.Sprintln(strings.Join(free[i], "\t"))
			bestTime += getTime(free[i][2])
		}
		result += fmt.Sprintf("%d:%02d.%02d\n\n", bestTime/100/60, bestTime/100%60, bestTime%100)

		end += 4
	}

	t.Error(result)
}

var best string
var bestTime int

func dfs(data [][][]string, used, inGroup map[string]bool, style int, choice []int, time int) {
	if time >= bestTime {
		return
	}

	if style == 4 {
		bestTime = time
		best = ""

		for k := range inGroup {
			delete(inGroup, k)
		}

		for i := 0; i < 4; i++ {
			best += strings.Join(data[i][choice[i]], "\t") + "\n"
			inGroup[data[i][choice[i]][1]] = true
		}

		return
	}

	group := data[style]
	for i := 0; i < len(group); i++ {
		swimmer := group[i]
		if _, found := used[swimmer[1]]; !found {
			used[swimmer[1]] = true
			choice[style] = i
			dfs(data, used, inGroup, style+1, choice, time+getTime(swimmer[2]))
			delete(used, swimmer[1])
		}
	}
}

func getTime(t string) int {
	m := 0
	p := strings.Split(t, ":")
	if len(p) == 2 {
		m, _ = strconv.Atoi(p[0])
		t = p[1]
	}
	p = strings.Split(t, ".")
	s, _ := strconv.Atoi(p[0])
	c, _ := strconv.Atoi(p[1])
	return (m*60+s)*100 + c
}
