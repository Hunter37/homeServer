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
#	docker run -p 8080:8080 home-server

.PHONY: push
push:
	az acr login --name hunterhome
	docker tag home-server hunterhome.azurecr.io/home-server
	docker push hunterhome.azurecr.io/home-server

.PHONY: pushdh
pushdh:
	# docker login --username xueweihan
	docker tag home-server xueweihan/home-server:0.1.0
	docker push xueweihan/home-server:0.1.0

.PHONY: all
all: clean format utest build


# Create azure app keys (json-auth):
# az ad sp create-for-rbac --name home-rg-deploy-app \
                           --role contributor \
						   --scopes /subscriptions/10e43d30-2be8-42eb-8fef-b334040d4cc0/resourceGroups/home-rg \
						   --json-auth

# az ad sp create-for-rbac --name home-rg-server-app \
                           --role "Storage Blob Data Contributor" \
						   --scopes /subscriptions/10e43d30-2be8-42eb-8fef-b334040d4cc0/resourceGroups/home-rg/providers/Microsoft.Storage/storageAccounts/homeserverdata \
						   --json-auth
