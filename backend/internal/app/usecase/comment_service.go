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

type CommentService struct {
	repo     ports.CommentRepository
	validate *validator.Validate
}

type CreateCommentInput struct {
	DocID      string `validate:"required,uuid4"`
	AuthorName string `validate:"required,max=40"`
	FromPos    int    `validate:"min=0"`
	ToPos      int    `validate:"min=0"`
	Text       string `validate:"required,max=2000"`
}

type UpdateCommentInput struct {
	DocID     string `validate:"required,uuid4"`
	CommentID string `validate:"required,uuid4"`
	Resolved  *bool
	Text      *string `validate:"omitempty,max=2000"`
}

func NewCommentService(repo ports.CommentRepository, validate *validator.Validate) *CommentService {
	return &CommentService{repo: repo, validate: validate}
}

func (s *CommentService) ListByDoc(ctx context.Context, docID string) ([]domain.Comment, error) {
	if err := s.validate.Var(docID, "required,uuid4"); err != nil {
		return nil, domain.ErrInvalidInput
	}
	return s.repo.ListByDocID(ctx, docID)
}

func (s *CommentService) Create(ctx context.Context, input CreateCommentInput) (domain.Comment, error) {
	input.AuthorName = strings.TrimSpace(input.AuthorName)
	input.Text = strings.TrimSpace(input.Text)
	if err := s.validate.Struct(input); err != nil {
		return domain.Comment{}, domain.ErrInvalidInput
	}
	if input.FromPos > input.ToPos {
		return domain.Comment{}, domain.ErrInvalidInput
	}

	comment := domain.Comment{
		ID:         uuid.New().String(),
		DocID:      input.DocID,
		AuthorName: input.AuthorName,
		FromPos:    input.FromPos,
		ToPos:      input.ToPos,
		Text:       input.Text,
		Resolved:   false,
		CreatedAt:  utils.NowUTC(),
	}
	return s.repo.Create(ctx, comment)
}

func (s *CommentService) Update(ctx context.Context, input UpdateCommentInput) (domain.Comment, error) {
	if input.Resolved == nil && input.Text == nil {
		return domain.Comment{}, domain.ErrInvalidInput
	}
	if input.Text != nil {
		trimmed := strings.TrimSpace(*input.Text)
		input.Text = &trimmed
	}
	if err := s.validate.Struct(input); err != nil {
		return domain.Comment{}, domain.ErrInvalidInput
	}
	return s.repo.Update(ctx, input.DocID, input.CommentID, input.Resolved, input.Text)
}
