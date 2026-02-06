package ws

type PresencePayload struct {
	Type   string `json:"type"`
	Name   string `json:"name"`
	Color  string `json:"color"`
	Typing bool   `json:"typing"`
	Cursor *struct {
		From int `json:"from"`
		To   int `json:"to"`
	} `json:"cursor"`
}

type CommentPayload struct {
	Type    string      `json:"type"`
	Comment interface{} `json:"comment"`
}

type SnapshotPayload struct {
	Type    string `json:"type"`
	DataB64 string `json:"dataB64"`
}
