package main

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"reflect"
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

func test() {
	// server
	go func() {
		mux := http.NewServeMux()
		mux.HandleFunc("/", func(writer http.ResponseWriter, request *http.Request) {
			writer.Header().Set("Connection", "close")
			writer.WriteHeader(http.StatusOK)
			writer.Write([]byte("Hello"))
			time.Sleep(10 * time.Minute)
			writer.Write([]byte("World"))
		})
		svr := &http.Server{
			Handler: mux,
			Addr:    ":8081",
		}

		go func() {
			time.Sleep(1 * time.Second)
			svr.Close()
		}()

		if err := svr.ListenAndServe(); err != nil {
			log.Println("Failed to start HTTP server")
		}
	}()

	// client
	func() {
		client := http.Client{Timeout: 10 * time.Second}
		resp, err := client.Get("http://localhost:8081/")
		fmt.Println(resp, reflect.TypeOf(err), err)
	}()

	time.Sleep(2 * time.Second)
	fmt.Println()
}

func test1() {
	// server
	go func() {
		listener, err := net.Listen("tcp", ":8083")
		if err != nil {
			log.Fatal(err)
		}

		defer listener.Close()

		conn, err := listener.Accept()
		if err != nil {
			log.Fatal("server", err)
			os.Exit(1)
		}
		data := make([]byte, 1)
		if _, err := conn.Read(data); err != nil {
			log.Fatal("server", err)
		}

		conn.Close()
	}()

	time.Sleep(3 * time.Second) // wait for server to run

	// client
	func() {
		client := http.Client{Timeout: 10 * time.Second}
		resp, err := client.Get("http://localhost:8083/")
		fmt.Println(resp, reflect.TypeOf(err), err)
		//conn, err := net.Dial("tcp", "localhost:8083")
		//if err != nil {
		//	log.Fatal("client", err)
		//}
		//
		//if _, err := conn.Write([]byte("ab")); err != nil {
		//	log.Printf("client: %v", err)
		//}
		//
		//time.Sleep(1 * time.Second) // wait for close on the server side
		//
		//data := make([]byte, 1)
		//if _, err := conn.Read(data); err != nil {
		//	log.Printf("client: %v", err)
		//	if errors.Is(err, syscall.ECONNRESET) {
		//		log.Print("This is connection reset by peer error")
		//	}
		//}
	}()
	fmt.Println()
}

func test2() {
	client := http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get("http://localhost:8089/")
	fmt.Println(resp, reflect.TypeOf(err), err)
	fmt.Println()
}

func test3() {
	for i := 0; i < 108; i++ {
		fmt.Printf("\033[%dm%3v\033[0m ", i, i)
	}

	fmt.Println()
	for true {
		utils.LogTempTime()
		time.Sleep(time.Second / 10)
	}
}

var router = map[string]func(http.ResponseWriter, *http.Request){
	"/favicon.ico":          iconHandler,
	"/health":               healthHandler,
	"/swim":                 swim.SwimHandler,
	"/apple-touch-icon.png": appleIconHandler,
}

func main() {
	//test()
	//test1()
	//test2()
	//test3()
	if len(os.Args) > 1 {
		host = os.Args[1]
		time.Sleep(time.Second)
		//} else {
		//	restart()
	}
	utils.Log(fmt.Sprintf("%v %v\n", utils.GetLogTime(), host))

	mux := http.NewServeMux()
	mux.HandleFunc("/", routerHandler)
	svr := &http.Server{
		Handler: mux,
		Addr:    ":8080",
		//Addr: ":8088",
	}

	go func() {
		for true {
			time.Sleep(60 * time.Second)
			healthCheck()
		}
	}()

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-c
		swim.CleanUp()
		fmt.Println("Bye!")
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
			//restart()
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
	utils.LogTempTime(HttpCache().ItemCount())
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
func restart() {
	cmd := exec.Command(os.Args[0], host)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	err := cmd.Start()
	if err != nil {
		utils.LogError(err)
	} else {
		fmt.Printf("%v \033[41mStart new process: %v %v\033[0m\n",
			time.Now().Format("2006-01-02 15:04.000 (MST)"),
			os.Args[0], cmd.Process.Pid)
	}

	swim.CleanUp()
	os.Exit(-1)
}
