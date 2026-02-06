package ports

type Hub interface {
	Run()
	Shutdown()
	GetRoom(docID string) Room
}

type Room interface {
	Broadcast(senderID string, messageType int, payload []byte)
	Register(client Client)
	Unregister(clientID string)
}

type Client interface {
	ID() string
	Send(messageType int, payload []byte) error
	Close() error
}
