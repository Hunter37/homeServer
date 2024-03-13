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
	1	Luke Han	33.06	2/23/24	10	2013/03/23	PN	Bellevue Club Swim Te	PN February Age
	2	Nikolai Ryndin	34.55	2/03/24	10	2013/12/01	PN	Bellevue Club Swim Te	PN BISC Bluefin
	3	Ethan Fei	36.37	2/23/24	10	2013/12/24	PN	Bellevue Club Swim Te	PN February Age
	4	Fedor Ryndin	37.69	2/23/24	9	2015/01/18	PN	Bellevue Club Swim Te	PN February Age
	5	Blake Gibbs	39.94	10/14/23	8	2015/03/15	PN	Bellevue Club Swim Te	PN CSC Fall Cla
	6	Alexander Han	40.33	1/21/24	9	2014/05/01 - 05/05	PN	Bellevue Club Swim Te	PN BC 25th Annu
	7	Ayush Belur	40.35	11/19/22	10	2013/06/22	PN	Bellevue Club Swim Te	PN Nov. AGI, Di
	8	Zegen Brink	40.84	2/23/24	10	2013/11/30	PN	Bellevue Club Swim Te	PN February Age
									
	1	Alexander Han	39.39	12/08/23	9	2014/05/01 - 05/05	PN	Bellevue Club Swim Te	PNS 14&U Short
	2	Luke Han	40.18	11/18/23	10	2013/03/23	PN	Bellevue Club Swim Te	PN November AGI
	3	Zegen Brink	42.96	11/04/23	10	2013/11/30	PN	Bellevue Club Swim Te	PN BISC Bob Mil
	4	Nikolai Ryndin	44.43	2/03/24	10	2013/12/01	PN	Bellevue Club Swim Te	PN BISC Bluefin
	5	Ethan Fei	44.49	2/23/24	10	2013/12/24	PN	Bellevue Club Swim Te	PN February Age
	6	Fedor Ryndin	46.80	2/03/24	9	2015/01/18	PN	Bellevue Club Swim Te	PN BISC Bluefin
	7	Brennan Garr	47.22	2/23/24	9	2015/03/06	PN	Bellevue Club Swim Te	PN February Age
	8	Blake Gibbs	47.79	10/14/23	8	2015/03/15	PN	Bellevue Club Swim Te	PN CSC Fall Cla
									
	1	Luke Han	32.10	2/23/24	10	2013/03/23	PN	Bellevue Club Swim Te	PN February Age
	2	Ethan Fei	35.93	11/18/23	10	2013/12/24	PN	Bellevue Club Swim Te	PN November AGI
	3	Nikolai Ryndin	36.20	2/03/24	10	2013/12/01	PN	Bellevue Club Swim Te	PN BISC Bluefin
	4	Alexander Han	37.04	2/23/24	9	2014/05/01 - 05/05	PN	Bellevue Club Swim Te	PN February Age
	5	Blake Gibbs	37.61	10/14/23	8	2015/03/15	PN	Bellevue Club Swim Te	PN CSC Fall Cla
	6	Ayush Belur	37.77	2/23/24	10	2013/06/22	PN	Bellevue Club Swim Te	PN February Age
	7	Ray Liu	38.29	2/23/24	9	2014/07/22 - 10/01	PN	Bellevue Club Swim Te	PN February Age
	8	Zegen Brink	39.02	2/23/24	10	2013/11/30	PN	Bellevue Club Swim Te	PN February Age
									
	1	Luke Han	29.39	2/23/24	10	2013/03/23	PN	Bellevue Club Swim Te	PN February Age
	2	Nikolai Ryndin	30.28	2/23/24	10	2013/12/01	PN	Bellevue Club Swim Te	PN February Age
	3	Ethan Fei	30.82	2/23/24	10	2013/12/24	PN	Bellevue Club Swim Te	PN February Age
	4	Alexander Han	32.25	2/23/24	9	2014/05/01 - 05/05	PN	Bellevue Club Swim Te	PN February Age
	5	Fedor Ryndin	33.91	1/21/24	9	2015/01/18	PN	Bellevue Club Swim Te	PN BC 25th Annu
	6	Zegen Brink	34.67	12/08/23	10	2013/11/30	PN	Bellevue Club Swim Te	PNS 14&U Short
	7	Blake Gibbs	34.93	10/14/23	8	2015/03/15	PN	Bellevue Club Swim Te	PN CSC Fall Cla
	8	Ayush Belur	35.20	7/21/23	10	2013/06/22	PN	Bellevue Club Swim Te	PN MET Short Co
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

	//t.Error(result)
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
