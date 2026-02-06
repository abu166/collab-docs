package repo

import (
	"context"

	"collabdocs/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CommentRepo struct {
	pool *pgxpool.Pool
}

func NewCommentRepo(pool *pgxpool.Pool) *CommentRepo {
	return &CommentRepo{pool: pool}
}

func (r *CommentRepo) ListByDocID(ctx context.Context, docID string) ([]domain.Comment, error) {
	const q = `
SELECT id, doc_id, author_name, from_pos, to_pos, text, resolved, created_at
FROM doc_comments
WHERE doc_id = $1
ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, q, docID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	comments := make([]domain.Comment, 0)
	for rows.Next() {
		var c domain.Comment
		if err := rows.Scan(&c.ID, &c.DocID, &c.AuthorName, &c.FromPos, &c.ToPos, &c.Text, &c.Resolved, &c.CreatedAt); err != nil {
			return nil, err
		}
		comments = append(comments, c)
	}
	return comments, nil
}

func (r *CommentRepo) Create(ctx context.Context, comment domain.Comment) (domain.Comment, error) {
	const q = `
INSERT INTO doc_comments (id, doc_id, author_name, from_pos, to_pos, text, resolved, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, doc_id, author_name, from_pos, to_pos, text, resolved, created_at`

	row := r.pool.QueryRow(ctx, q, comment.ID, comment.DocID, comment.AuthorName, comment.FromPos, comment.ToPos, comment.Text, comment.Resolved, comment.CreatedAt)
	var out domain.Comment
	if err := row.Scan(&out.ID, &out.DocID, &out.AuthorName, &out.FromPos, &out.ToPos, &out.Text, &out.Resolved, &out.CreatedAt); err != nil {
		return domain.Comment{}, err
	}
	return out, nil
}

func (r *CommentRepo) Update(ctx context.Context, docID string, commentID string, resolved *bool, text *string) (domain.Comment, error) {
	const q = `
UPDATE doc_comments
SET
  resolved = COALESCE($3, resolved),
  text = COALESCE($4, text)
WHERE id = $1 AND doc_id = $2
RETURNING id, doc_id, author_name, from_pos, to_pos, text, resolved, created_at`

	row := r.pool.QueryRow(ctx, q, commentID, docID, resolved, text)
	var out domain.Comment
	if err := row.Scan(&out.ID, &out.DocID, &out.AuthorName, &out.FromPos, &out.ToPos, &out.Text, &out.Resolved, &out.CreatedAt); err != nil {
		if err == pgx.ErrNoRows {
			return domain.Comment{}, domain.ErrNotFound
		}
		return domain.Comment{}, err
	}
	return out, nil
}
