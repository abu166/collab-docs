package hub

import (
	"sync"

	"github.com/gorilla/websocket"
)

type WSClient struct {
	id   string
	conn *websocket.Conn
	mu   sync.Mutex
}

func NewWSClient(id string, conn *websocket.Conn) *WSClient {
	return &WSClient{id: id, conn: conn}
}

func (c *WSClient) ID() string {
	return c.id
}

func (c *WSClient) Send(messageType int, payload []byte) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.conn.WriteMessage(messageType, payload)
}

func (c *WSClient) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.conn.Close()
}
