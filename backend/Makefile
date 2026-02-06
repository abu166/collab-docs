APP_NAME=collabdocs
MIGRATIONS=internal/infrastructure/db/migrations

.PHONY: dev build run tidy migrate-up migrate-down

dev:
	APP_PORT=8080 go run ./cmd/collabdocs

build:
	go build -o bin/$(APP_NAME) ./cmd/collabdocs

run: build
	./bin/$(APP_NAME)

tidy:
	go mod tidy

migrate-up:
	migrate -path $(MIGRATIONS) -database "$$DB_DSN" up

migrate-down:
	migrate -path $(MIGRATIONS) -database "$$DB_DSN" down
