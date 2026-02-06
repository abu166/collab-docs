package domain

import "time"

// Document represents document metadata.
type Document struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"-"`
	UpdatedAt time.Time `json:"updatedAt"`
}
