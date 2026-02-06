package ports

import (
	"context"

	"collabdocs/internal/domain"
)

type DocumentRepository interface {
	Create(ctx context.Context, doc domain.Document) (domain.Document, error)
	GetByID(ctx context.Context, id string) (domain.Document, error)
	UpdateTitle(ctx context.Context, id string, title string) (domain.Document, error)
	Delete(ctx context.Context, id string) error
}

type CommentRepository interface {
	ListByDocID(ctx context.Context, docID string) ([]domain.Comment, error)
	Create(ctx context.Context, comment domain.Comment) (domain.Comment, error)
	Update(ctx context.Context, docID string, commentID string, resolved *bool, text *string) (domain.Comment, error)
}

type SnapshotRepository interface {
	GetSnapshot(ctx context.Context, docID string) ([]byte, error)
	UpsertSnapshot(ctx context.Context, docID string, snapshot []byte) error
}

type UpdateRepository interface {
	AppendUpdate(ctx context.Context, docID string, update []byte) error
}
