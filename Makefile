export LANGUAGES := go

.DEFAULT_GOAL := all

.PHONY: clean
clean:
	rm -f go.sum
	rm -f bin/*

.PHONY: dependencies
dependencies:
	go mod tidy
	go mod vendor

.PHONY: format
format: dependencies
	golangci-lint run --fix

.PHONY: utest
utest: dependencies
	go test -v ./...

.PHONY: build
build: dependencies
	go build -o bin/
	ln -sf bin/homeServer homeServer

.PHONY: all
all: clean format utest build
