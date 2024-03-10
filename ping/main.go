package main

import (
	"crypto/tls"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

func main() {
	urls := strings.Split(os.Getenv("URLS"), ",")

	log.Println(http.DefaultTransport.(*http.Transport).TLSClientConfig)

	content := []byte(fmt.Sprintf("ping (%s %s) %s", os.Getenv("TAG"), time.Now().Format("[2006-01-02 15:04:05.000]"), urls))

	client := &http.Client{
		Timeout: time.Second * 10,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
				// ServerName: "swimrank.azurewebsites.net",
			},
		},
	}

	delayStr := os.Getenv("DELAY")
	delay, err := strconv.Atoi(delayStr)
	if err != nil {
		log.Fatal(err)
	}

	go func() {
		for {
			for _, url := range urls {
				go func(url string) {
					resp, err := client.Get(url)
					if err != nil {
						log.Println(err)
						return
					}

					defer resp.Body.Close()
					body, err := io.ReadAll(resp.Body)
					if err != nil {
						log.Println(err)
						return
					}

					log.Printf("OUT get:[%v]", string(body))
				}(url)
			}
			time.Sleep(time.Minute * time.Duration(delay))
		}
	}()

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("IN get:[%s]", r.RemoteAddr)
		w.WriteHeader(http.StatusOK)
		w.Write(content)
	})
	log.Fatal(http.ListenAndServe(":8088", nil))
}
