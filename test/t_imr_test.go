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
	1	Noah Arthiabah	31.86	11/18/23	10	2013/02/06	PN	Bellevue Club Swim Te	PN November AGI
	2	Luke Han	34.32	11/18/23	10	2013/03/23	PN	Bellevue Club Swim Te	PN November AGI
	3	Nikolai Ryndin	35.20	12/08/23	10	2013/12/01	PN	Bellevue Club Swim Te	PNS 14&U Short
	4	Ethan Fei	37.78	11/18/23	9	2013/12/24	PN	Bellevue Club Swim Te	PN November AGI
	5	David Fan	39.42	12/08/23	10	2012/12/12	PN	Bellevue Club Swim Te	PNS 14&U Short
	6	Blake Gibbs	39.94	10/14/23	8	2015/03/15	PN	Bellevue Club Swim Te	PN CSC Fall Cla
	7	Ayush Belur	40.35	11/19/22	10	2013/06/22	PN	Bellevue Club Swim Te	PN Nov. AGI, Di
	8	Lexton Chang	40.39	10/14/23	10	2012/12/09 - 2013/10/14	PN	Bellevue Club Swim Te	PN CSC Fall Cla
			
	1	Noah Arthiabah	34.99	11/04/23	10	2013/02/06	PN	Bellevue Club Swim Te	PN BISC Bob Mil
	2	Alexander Han	39.39	12/08/23	9	2014/05/01 - 05/05	PN	Bellevue Club Swim Te	PNS 14&U Short
	3	Luke Han	40.18	11/18/23	10	2013/03/23	PN	Bellevue Club Swim Te	PN November AGI
	4	Lexton Chang	42.61	11/04/23	10	2012/12/09 - 2013/10/14	PN	Bellevue Club Swim Te	PN BISC Bob Mil
	5	Zegen Brink	42.96	11/04/23	10	2013/11/30	PN	Bellevue Club Swim Te	PN BISC Bob Mil
	6	David Fan	43.25	11/04/23	10	2012/12/12	PN	Bellevue Club Swim Te	PN BISC Bob Mil
	7	Ethan Fei	46.06	11/18/23	9	2013/12/24	PN	Bellevue Club Swim Te	PN November AGI
	8	Fedor Ryndin	47.20	10/14/23	8	2015/01/18	PN	Bellevue Club Swim Te	PN CSC Fall Cla
			
	1	Noah Arthiabah	28.42	12/08/23	10	2013/02/06	PN	Bellevue Club Swim Te	PNS 14&U Short
	2	Luke Han	32.78	12/08/23	10	2013/03/23	PN	Bellevue Club Swim Te	PNS 14&U Short
	3	Ethan Fei	35.93	11/18/23	9	2013/12/24	PN	Bellevue Club Swim Te	PN November AGI
	4	Nikolai Ryndin	36.77	11/18/23	10	2013/12/01	PN	Bellevue Club Swim Te	PN November AGI
	5	Blake Gibbs	37.61	10/14/23	8	2015/03/15	PN	Bellevue Club Swim Te	PN CSC Fall Cla
	6	Alexander Han	37.63	11/18/23	9	2014/05/01 - 05/05	PN	Bellevue Club Swim Te	PN November AGI
	7	David Fan	37.95	12/02/23	10	2012/12/12	PN	Bellevue Club Swim Te	PN Fall Divisio
	8	Ayush Belur	38.74	12/08/23	10	2013/06/22	PN	Bellevue Club Swim Te	PNS 14&U Short
			
	1	Noah Arthiabah	25.86	12/08/23	10	2013/02/06	PN	Bellevue Club Swim Te	PNS 14&U Short
	2	Luke Han	30.02	11/18/23	10	2013/03/23	PN	Bellevue Club Swim Te	PN November AGI
	3	Ethan Fei	31.30	12/08/23	9	2013/12/24	PN	Bellevue Club Swim Te	PNS 14&U Short
	4	Nikolai Ryndin	31.58	11/18/23	10	2013/12/01	PN	Bellevue Club Swim Te	PN November AGI
	5	Alexander Han	33.04	11/18/23	9	2014/05/01 - 05/05	PN	Bellevue Club Swim Te	PN November AGI
	6	David Fan	34.00	11/18/23	10	2012/12/12	PN	Bellevue Club Swim Te	PN November AGI
	7	Fedor Ryndin	34.36	12/02/23	8	2015/01/18	PN	Bellevue Club Swim Te	PN Fall Divisio
	8	Zegen Brink	34.67	12/08/23	10	2013/11/30	PN	Bellevue Club Swim Te	PNS 14&U Short
	`

	data := make([][][]string, 0)

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

			fmt.Printf("MR %d\n%s%d:%02d.%02d\n\n", i+1, best, bestTime/100/60, bestTime/100%60, bestTime%100)

			for k := range inGroup {
				used[k] = true
			}
		}
	}

	i := 0
	end := 4
	for end <= len(free) {
		bestTime = 0

		fmt.Printf("FR %d\n", (i+1)/4)
		for ; i < end; i++ {
			fmt.Println(strings.Join(free[i], "\t"))
			bestTime += getTime(free[i][2])
		}
		fmt.Printf("%d:%02d.%02d\n\n", bestTime/100/60, bestTime/100%60, bestTime%100)

		end += 4
	}
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
