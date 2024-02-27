export LANGUAGES := go

.DEFAULT_GOAL := all
# TAG := $(shell date '+%Y-%m-%dT%H-%M-%SZ')

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

.PHONY: docker
docker:
	docker build -t home-server .
	docker run -p 8080:8080 home-server

.PHONY: push
push:
	az acr login --name hunterhome
	docker tag home-server hunterhome.azurecr.io/home-server
	docker push hunterhome.azurecr.io/home-server

.PHONY: all
all: clean format utest build
