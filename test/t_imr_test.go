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
	1	Leon Huang	25.42	11/18/23	12	2011/03/12	PN	Bellevue Club Swim Te	PN November AGI
	2	Carter Neal	26.16	11/04/23	12	2011/05/27	PN	Bellevue Club Swim Te	PN BISC Bob Mil
	3	Ryan Shaw	26.28	11/18/23	12	2011/02/14	PN	Bellevue Club Swim Te	PN November AGI
	4	Jayden Han	26.59	11/04/23	12	2011/03/27 - 04/30	PN	Bellevue Club Swim Te	PN BISC Bob Mil
	5	Anderson Tseng	26.81	11/18/23	12	2011/07/31	PN	Bellevue Club Swim Te	PN November AGI
	6	DJ Vukadinovic	27.24	11/05/22	11	2012/01/08	PN	Bellevue Club Swim Te	PN BISC Bob Mil
	7	Yan Zhang	27.40	11/04/23	12	2011/08/08	PN	Bellevue Club Swim Te	PN BISC Bob Mil
	8	Fitz McCullough	28.64	10/14/23	12	2011/09/26	PN	Bellevue Club Swim Te	PN CSC Fall Cla
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
