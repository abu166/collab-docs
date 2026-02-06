package domain

import "time"

// Comment is an inline comment attached to a document.
type Comment struct {
	ID         string    `json:"id"`
	DocID      string    `json:"docId"`
	AuthorName string    `json:"authorName"`
	FromPos    int       `json:"fromPos"`
	ToPos      int       `json:"toPos"`
	Text       string    `json:"text"`
	Resolved   bool      `json:"resolved"`
	CreatedAt  time.Time `json:"createdAt"`
}
