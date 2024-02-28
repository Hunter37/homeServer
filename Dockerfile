# build stage
FROM golang:1.22.0-alpine3.19 AS build-env

WORKDIR /src
COPY . .
RUN go build 



# final stage
# FROM alpine:3.19.1
FROM alpine@sha256:c5b1261d6d3e43071626931fc004f70149baeba2c8ec672bd4f27761f8e1ad6b

WORKDIR /app
COPY --from=build-env /src/homeServer ./homeServer
# COPY --from=build-env /src/data/*.json ./data/
# COPY --from=build-env /src/swim/html/ ./swim/html/
# RUN mkdir backup

ENV STORAGE=AZURE_BLOB
EXPOSE 8080
CMD ["/app/homeServer"]