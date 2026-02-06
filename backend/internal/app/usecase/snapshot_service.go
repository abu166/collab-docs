package usecase

import (
	"context"

	"collabdocs/internal/app/ports"
	"collabdocs/internal/domain"
	"github.com/go-playground/validator/v10"
)

type SnapshotService struct {
	snapshots ports.SnapshotRepository
	updates   ports.UpdateRepository
	validate  *validator.Validate
}

func NewSnapshotService(snapshots ports.SnapshotRepository, updates ports.UpdateRepository, validate *validator.Validate) *SnapshotService {
	return &SnapshotService{snapshots: snapshots, updates: updates, validate: validate}
}

func (s *SnapshotService) GetSnapshot(ctx context.Context, docID string) ([]byte, error) {
	if err := s.validate.Var(docID, "required,uuid4"); err != nil {
		return nil, domain.ErrInvalidInput
	}
	return s.snapshots.GetSnapshot(ctx, docID)
}

func (s *SnapshotService) UpsertSnapshot(ctx context.Context, docID string, snapshot []byte) error {
	if err := s.validate.Var(docID, "required,uuid4"); err != nil {
		return domain.ErrInvalidInput
	}
	if len(snapshot) == 0 {
		return domain.ErrInvalidInput
	}
	return s.snapshots.UpsertSnapshot(ctx, docID, snapshot)
}

func (s *SnapshotService) AppendUpdate(ctx context.Context, docID string, update []byte) error {
	if s.updates == nil {
		return nil
	}
	if err := s.validate.Var(docID, "required,uuid4"); err != nil {
		return domain.ErrInvalidInput
	}
	if len(update) == 0 {
		return domain.ErrInvalidInput
	}
	return s.updates.AppendUpdate(ctx, docID, update)
}
