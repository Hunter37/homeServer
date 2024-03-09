FROM golang:1.22.0-alpine3.19 AS build-env

WORKDIR /src
COPY . .
RUN go build -o ./release/ping .


# FROM busybox:1.36.1 (4.26M) no ca cert
FROM busybox:1.36.1@sha256:650fd573e056b679a5110a70aabeb01e26b76e545ec4b9c70a9523f2dfaf18c6

WORKDIR /app
COPY --from=build-env /src/release/ping ./ping

ARG TAG=0.0.0
ENV TAG=$TAG

ENV URLS="http://localhost:8088"
ENV DELAY=5

EXPOSE 8088
CMD ["./ping"]