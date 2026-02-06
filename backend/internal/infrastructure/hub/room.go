package hub

import (
	"sync"

	"collabdocs/internal/app/ports"
)

type broadcastMessage struct {
	senderID    string
	messageType int
	payload     []byte
}

type Room struct {
	id        string
	clients   map[string]ports.Client
	register  chan ports.Client
	unregister chan string
	broadcast chan broadcastMessage
	closed    chan struct{}
	mu        sync.RWMutex
}

func NewRoom(id string) *Room {
	return &Room{
		id:        id,
		clients:   make(map[string]ports.Client),
		register:  make(chan ports.Client),
		unregister: make(chan string),
		broadcast: make(chan broadcastMessage, 256),
		closed:    make(chan struct{}),
	}
}

func (r *Room) Run() {
	for {
		select {
		case client := <-r.register:
			r.mu.Lock()
			r.clients[client.ID()] = client
			r.mu.Unlock()
		case clientID := <-r.unregister:
			r.mu.Lock()
			if c, ok := r.clients[clientID]; ok {
				_ = c.Close()
				delete(r.clients, clientID)
			}
			r.mu.Unlock()
		case msg := <-r.broadcast:
			r.mu.RLock()
			for id, client := range r.clients {
				if id == msg.senderID {
					continue
				}
				_ = client.Send(msg.messageType, msg.payload)
			}
			r.mu.RUnlock()
		case <-r.closed:
			return
		}
	}
}

func (r *Room) Broadcast(senderID string, messageType int, payload []byte) {
	select {
	case r.broadcast <- broadcastMessage{senderID: senderID, messageType: messageType, payload: payload}:
	default:
		// drop if channel is full
	}
}

func (r *Room) Register(client ports.Client) {
	r.register <- client
}

func (r *Room) Unregister(clientID string) {
	r.unregister <- clientID
}

func (r *Room) Close() {
	close(r.closed)
}

var _ ports.Room = (*Room)(nil)
