FROM golang:1.22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /collabdocs ./cmd/collabdocs

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /collabdocs /app/collabdocs
EXPOSE 8080
ENTRYPOINT ["/app/collabdocs"]
