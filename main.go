package main

import (
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	. "homeServer/http"
	"homeServer/swim"
	"homeServer/utils"
)

const httpServerClosed = "http: Server closed"

var (
	host = "c1469969.eero.online:3737" //"73.19.5.132:3737"
)

var router = map[string]func(http.ResponseWriter, *http.Request){
	"/favicon.ico":                      iconHandler,
	"/health":                           healthHandler,
	"/swim":                             swim.SwimHandler,
	"/apple-touch-icon.png":             appleIconHandler,
	"/apple-touch-icon-precomposed.png": appleIconHandler,
}

func main() {
	if len(os.Args) > 1 {
		host = os.Args[1]
		time.Sleep(time.Second)
	}
	utils.Log(fmt.Sprintf("%v %v\n", utils.GetLogTime(), host))

	swimStop := swim.Start()

	mux := http.NewServeMux()
	mux.HandleFunc("/", routerHandler)
	svr := &http.Server{
		Handler: mux,
		Addr:    ":8080",
		//Addr: ":8088",
	}

	go func() {
		for {
			time.Sleep(60 * time.Second)
			healthCheck()
		}
	}()

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-c
		swimStop()
		utils.Log("\nBye!\n")
		os.Exit(1)
	}()

	if err := svr.ListenAndServe(); err != nil && err.Error() != httpServerClosed {
		fmt.Println("Failed to start HTTP server")
	}
}

func healthCheck() {
	client := http.Client{Timeout: 5 * time.Second}

	resp, err := Retry(func() (*http.Response, error) {
		return client.Get("http://" + host + "/health")
	}, 3, 3*time.Second)
	defer CloseBody(resp)

	if err != nil || resp.StatusCode != http.StatusOK {
		resp2, err2 := client.Get("https://google.com")
		defer CloseBody(resp2)
		if err2 != nil || resp2.StatusCode != http.StatusOK {
			utils.Log(fmt.Sprintf("\033[31m%v\033[0m\n", utils.GetLogTime()))
		} else {
			utils.LogError(err)
			//restart(swimStop)
		}
	}
}

func routerHandler(writer http.ResponseWriter, req *http.Request) {
	for path, handler := range router {
		if strings.Index(req.URL.Path, path) == 0 {
			handler(writer, req)
			return
		}
	}

	utils.LogHttpCaller(req, false)
	writer.Header().Set("Connection", "close")
	writer.Header().Set("Location", "http://localhost")
	writer.WriteHeader(http.StatusMovedPermanently)
}

func healthHandler(writer http.ResponseWriter, req *http.Request) {
	utils.LogTempTime()
	writer.Header().Set("Connection", "close")
	writer.WriteHeader(http.StatusOK)
}

func iconHandler(writer http.ResponseWriter, req *http.Request) {
	utils.LogHttpCaller(req, true)
	writer.Header().Set("Location", "https://www.usaswimming.org/favicon.ico")
	writer.WriteHeader(http.StatusMovedPermanently)
}

func appleIconHandler(writer http.ResponseWriter, req *http.Request) {
	utils.LogHttpCaller(req, true)
	writer.Header().Set("Location", "https://www.usaswimming.org/ResourcePackages/Usas/assets/dist/images/ShieldWebsiteMain.png")
	writer.WriteHeader(http.StatusMovedPermanently)
}

//func restart(swimStop func()) {
//	cmd := exec.Command(os.Args[0], host)
//	cmd.Stdout = os.Stdout
//	cmd.Stderr = os.Stderr
//	cmd.Stdin = os.Stdin
//	err := cmd.Start()
//	if err != nil {
//		utils.LogError(err)
//	} else {
//		fmt.Printf("%v \033[41mStart new process: %v %v\033[0m\n",
//			time.Now().Format("2006-01-02 15:04.000 (MST)"),
//			os.Args[0], cmd.Process.Pid)
//	}
//
//	swimStop()
//	os.Exit(-1)
//}
