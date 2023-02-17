export LANGUAGES := go

.DEFAULT_GOAL := all

.PHONY: prepare clean dependencies lint utest format all

clean:
	rm -f go.sum

dependencies:
	go mod tidy
	go mod vendor

lint: dependencies
	golangci-lint run

utest: dependencies
	go test -v ./...

format: dependencies
	golangci-lint run --fix

all: clean format utest
