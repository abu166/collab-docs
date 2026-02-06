package usecase

import (
	"context"
	"strings"

	"collabdocs/internal/app/ports"
	"collabdocs/internal/domain"
	"collabdocs/pkg/utils"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

type DocumentService struct {
	repo     ports.DocumentRepository
	validate *validator.Validate
}

type CreateDocumentInput struct {
	Title string `validate:"max=120"`
}

type UpdateDocumentInput struct {
	ID    string `validate:"required,uuid4"`
	Title string `validate:"required,max=120"`
}

type DeleteDocumentInput struct {
	ID string `validate:"required,uuid4"`
}

func NewDocumentService(repo ports.DocumentRepository, validate *validator.Validate) *DocumentService {
	return &DocumentService{repo: repo, validate: validate}
}

func (s *DocumentService) Create(ctx context.Context, input CreateDocumentInput) (domain.Document, error) {
	input.Title = strings.TrimSpace(input.Title)
	if input.Title == "" {
		input.Title = "Untitled Document"
	}
	if err := s.validate.Struct(input); err != nil {
		return domain.Document{}, domain.ErrInvalidInput
	}

	id := uuid.New().String()
	now := utils.NowUTC()
	return s.repo.Create(ctx, domain.Document{
		ID:        id,
		Title:     input.Title,
		CreatedAt: now,
		UpdatedAt: now,
	})
}

func (s *DocumentService) Get(ctx context.Context, id string) (domain.Document, error) {
	if err := s.validate.Var(id, "required,uuid4"); err != nil {
		return domain.Document{}, domain.ErrInvalidInput
	}
	return s.repo.GetByID(ctx, id)
}

func (s *DocumentService) UpdateTitle(ctx context.Context, input UpdateDocumentInput) (domain.Document, error) {
	input.Title = strings.TrimSpace(input.Title)
	if err := s.validate.Struct(input); err != nil {
		return domain.Document{}, domain.ErrInvalidInput
	}
	return s.repo.UpdateTitle(ctx, input.ID, input.Title)
}

func (s *DocumentService) Delete(ctx context.Context, input DeleteDocumentInput) error {
	if err := s.validate.Struct(input); err != nil {
		return domain.ErrInvalidInput
	}
	return s.repo.Delete(ctx, input.ID)
}
