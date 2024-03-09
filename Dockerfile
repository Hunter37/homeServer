# build stage
FROM golang:1.22.0-alpine3.19 AS build-env

WORKDIR /src
COPY . .
RUN go build -o ./release/homeServer .



# final stage
# FROM alpine:3.19.1 (7.37M)
# FROM alpine:3.19.1@sha256:c5b1261d6d3e43071626931fc004f70149baeba2c8ec672bd4f27761f8e1ad6b

# FROM busybox:1.36.1 (4.26M)
FROM busybox:1.36.1@sha256:650fd573e056b679a5110a70aabeb01e26b76e545ec4b9c70a9523f2dfaf18c6

WORKDIR /app
COPY --from=build-env /src/release/homeServer ./homeServer
# COPY --from=build-env /src/data/*.json ./data/
# COPY --from=build-env /src/swim/html/ ./swim/html/
ARG TAG=0.0.0
ENV TAG=$TAG
ENV STORAGE=AZURE_BLOB
ENV IDENTITY=MSI
EXPOSE 8080
CMD ["./homeServer"]