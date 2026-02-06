package ws

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"

	"collabdocs/internal/app/ports"
	"collabdocs/internal/app/usecase"
	"collabdocs/internal/domain"
	"collabdocs/internal/infrastructure/hub"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

type Handler struct {
	hub          ports.Hub
	snapshotSvc  *usecase.SnapshotService
	log          *zap.Logger
	maxBinBytes  int64
	maxTextBytes int64
	upgrader     websocket.Upgrader
}

func NewHandler(hub ports.Hub, snapshotSvc *usecase.SnapshotService, log *zap.Logger, maxBin, maxText int64) *Handler {
	return &Handler{
		hub:         hub,
		snapshotSvc: snapshotSvc,
		log:         log,
		maxBinBytes: maxBin,
		maxTextBytes: maxText,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

func (h *Handler) Handle(w http.ResponseWriter, r *http.Request) {
	docID := r.URL.Query().Get("docId")
	name := strings.TrimSpace(r.URL.Query().Get("name"))
	if _, err := uuid.Parse(docID); err != nil {
		http.Error(w, "invalid docId", http.StatusBadRequest)
		return
	}
	if name == "" {
		http.Error(w, "name required", http.StatusBadRequest)
		return
	}

	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.log.Error("ws upgrade failed", zap.Error(err))
		return
	}
	defer conn.Close()

	clientID := uuid.New().String()
	room := h.hub.GetRoom(docID)
	client := hub.NewWSClient(clientID, conn)
	room.Register(client)
	defer room.Unregister(clientID)

	conn.SetReadLimit(max(h.maxBinBytes, h.maxTextBytes))

	// Send snapshot if exists
	if h.snapshotSvc != nil {
		snap, err := h.snapshotSvc.GetSnapshot(r.Context(), docID)
		if err == nil && len(snap) > 0 {
			payload := SnapshotPayload{
				Type:    "snapshot",
				DataB64: base64.StdEncoding.EncodeToString(snap),
			}
			data, _ := json.Marshal(payload)
			_ = client.Send(websocket.TextMessage, data)
		}
	}

	for {
		msgType, data, err := conn.ReadMessage()
		if err != nil {
			break
		}

		if msgType == websocket.BinaryMessage {
			if int64(len(data)) > h.maxBinBytes {
				_ = conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseMessageTooBig, "binary message too large"))
				break
			}
			if h.snapshotSvc != nil {
				_ = h.snapshotSvc.AppendUpdate(r.Context(), docID, data)
			}
			room.Broadcast(clientID, websocket.BinaryMessage, data)
			continue
		}

		if msgType == websocket.TextMessage {
			if int64(len(data)) > h.maxTextBytes {
				_ = conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseMessageTooBig, "text message too large"))
				break
			}

			var raw map[string]any
			if err := json.Unmarshal(data, &raw); err != nil {
				continue
			}
			msgTypeValue, _ := raw["type"].(string)
			switch msgTypeValue {
			case "snapshot":
				var payload SnapshotPayload
				if err := json.Unmarshal(data, &payload); err != nil {
					continue
				}
				if payload.DataB64 == "" {
					continue
				}
				snapshot, err := base64.StdEncoding.DecodeString(payload.DataB64)
				if err != nil {
					continue
				}
				if h.snapshotSvc != nil {
					_ = h.snapshotSvc.UpsertSnapshot(r.Context(), docID, snapshot)
				}
				room.Broadcast(clientID, websocket.TextMessage, data)
			case "presence", "comment:add", "comment:update":
				room.Broadcast(clientID, websocket.TextMessage, data)
			default:
				// ignore unknown
			}
		}
	}

	// On disconnect, broadcast presence typing false
	leave := PresencePayload{Type: "presence", Name: name, Color: "#000000", Typing: false}
	leaveData, _ := json.Marshal(leave)
	room.Broadcast(clientID, websocket.TextMessage, leaveData)
}

func max(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}

var _ = domain.ErrInvalidInput
