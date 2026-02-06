package hub

import (
	"sync"

	"collabdocs/internal/app/ports"
)

type Hub struct {
	mu    sync.RWMutex
	rooms map[string]*Room
	quit  chan struct{}
}

func NewHub() *Hub {
	return &Hub{
		rooms: make(map[string]*Room),
		quit:  make(chan struct{}),
	}
}

func (h *Hub) Run() {}

func (h *Hub) Shutdown() {
	close(h.quit)
	h.mu.Lock()
	defer h.mu.Unlock()
	for _, room := range h.rooms {
		room.Close()
	}
}

func (h *Hub) GetRoom(docID string) ports.Room {
	h.mu.Lock()
	defer h.mu.Unlock()
	room, ok := h.rooms[docID]
	if !ok {
		room = NewRoom(docID)
		h.rooms[docID] = room
		go room.Run()
	}
	return room
}

var _ ports.Hub = (*Hub)(nil)
