# collabdocs backend

Production-ready Go microservice for a real-time collaborative text editor. Provides REST + WebSocket APIs, persists document metadata, comments, and Yjs snapshots, and relays realtime updates.

## Requirements
- Go 1.22+
- PostgreSQL 16+
- `migrate` CLI (for local migrations)

## Environment variables
```
APP_PORT=8080
DB_DSN=postgres://collab:collab@localhost:5432/collabdocs?sslmode=disable
CORS_ORIGINS=http://localhost:5173
LOG_LEVEL=info
WS_MAX_BIN_BYTES=1048576
WS_MAX_TEXT_BYTES=65536
```

## Run locally
1) Start Postgres and run migrations:
```
createdb collabdocs
migrate -path internal/infrastructure/db/migrations -database "$DB_DSN" up
```
2) Run the service:
```
make dev
```

## Run with Docker
```
docker-compose up --build
```

## REST API examples
Create doc:
```
curl -X POST http://localhost:8080/docs \
  -H "Content-Type: application/json" \
  -d '{"title":"My doc"}'
```

Get doc:
```
curl http://localhost:8080/docs/<docId>
```

Update title:
```
curl -X PATCH http://localhost:8080/docs/<docId> \
  -H "Content-Type: application/json" \
  -d '{"title":"New title"}'
```

List comments:
```
curl http://localhost:8080/docs/<docId>/comments
```

Add comment:
```
curl -X POST http://localhost:8080/docs/<docId>/comments \
  -H "Content-Type: application/json" \
  -d '{"authorName":"Maria","fromPos":1,"toPos":10,"text":"Looks good"}'
```

Resolve comment:
```
curl -X PATCH http://localhost:8080/docs/<docId>/comments/<commentId> \
  -H "Content-Type: application/json" \
  -d '{"resolved":true}'
```

## WebSocket
Connect:
```
ws://localhost:8080/ws?docId=<uuid>&name=<displayName>
```

Behavior:
- Binary frames: Yjs updates (relayed to other clients, optionally stored).
- Text frames (JSON):
  - presence
    ```json
    {"type":"presence","name":"Maria","color":"#A78BFA","typing":true,"cursor":{"from":12,"to":12}}
    ```
  - comment:add / comment:update
    ```json
    {"type":"comment:add","comment":{...}}
    ```
  - snapshot (client sends to persist and optionally broadcast):
    ```json
    {"type":"snapshot","dataB64":"..."}
    ```

On connect, server sends latest snapshot (if any):
```json
{"type":"snapshot","dataB64":"..."}
```

## Notes
- This service does not implement CRDT math; it only relays Yjs updates and stores snapshots.
- No authentication in this MVP.

