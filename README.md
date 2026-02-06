# collab-docs
Real-time collaborative text editor (Google Docs‑lite) with a Go backend and a React frontend. The backend provides REST APIs, WebSocket relay, and snapshot persistence for Yjs. The frontend is a Vite + React + TypeScript app with TipTap + Yjs collaboration.

## What this project is
- Create and edit documents in the browser
- Share links for realtime collaboration
- Comments sidebar with resolve flow
- REST for metadata + comments
- WebSocket for realtime updates + presence

## Repository layout
```
backend/   Go microservice (REST + WebSocket + Postgres)
frontend/  Vite React app (UI + collaboration client)
```

## Requirements
- Node.js 18+ (for frontend)
- Go 1.22+ (for backend)
- Docker (recommended for backend + Postgres)

## Quick start (recommended)
### 1) Run backend with Docker
```
cd backend
docker compose up --build
```

Backend will be available at:
- REST: `http://localhost:8080`
- WebSocket: `ws://localhost:8080/ws`

### 2) Run frontend
```
cd frontend
npm install
npm run dev
```

Frontend will be available at:
- `http://localhost:5173`

## Environment variables
### Frontend (`frontend/.env.local`)
```
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080/ws
```

### Backend (Docker compose sets these)
```
APP_PORT=8080
DB_DSN=postgres://collab:collab@postgres:5432/collabdocs?sslmode=disable
CORS_ORIGINS=http://localhost:5173
LOG_LEVEL=info
WS_MAX_BIN_BYTES=1048576
WS_MAX_TEXT_BYTES=65536
```

## How to use
1) Open the frontend in the browser.
2) Click **New Document**.
3) You will be taken to `/doc/<id>`.
4) Use **Share** to copy the URL and send it to others.
5) Guests will be prompted for a display name when they join.

Notes:
- Owners are not forced to enter a name on their own doc.
- Guests must enter a name before editing.
- Deleting a document from the Home page removes it from your local list only.

## REST API summary
```
POST   /docs
GET    /docs/{id}
PATCH  /docs/{id}

GET    /docs/{id}/comments
POST   /docs/{id}/comments
PATCH  /docs/{id}/comments/{commentId}
```

## WebSocket summary
```
GET /ws?docId=<uuid>&name=<displayName>
```
Binary frames are Yjs updates. JSON frames include:
- presence
- comment:add
- comment:update
- snapshot (base64)

## Development tips
- If the frontend can’t connect, verify `frontend/.env.local` and restart Vite.
- If WebSocket errors appear briefly, they should auto‑reconnect.
- If a document is deleted by someone else, your editor becomes read‑only.

## Scripts
### Frontend
```
cd frontend
npm run dev
npm run build
```

### Backend
```
cd backend
make dev
make build
```
