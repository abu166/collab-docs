package repo

import (
	"context"

	"collabdocs/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DocumentRepo struct {
	pool *pgxpool.Pool
}

func NewDocumentRepo(pool *pgxpool.Pool) *DocumentRepo {
	return &DocumentRepo{pool: pool}
}

func (r *DocumentRepo) Create(ctx context.Context, doc domain.Document) (domain.Document, error) {
	const q = `
INSERT INTO docs (id, title, created_at, updated_at)
VALUES ($1, $2, $3, $4)
RETURNING id, title, created_at, updated_at`

	row := r.pool.QueryRow(ctx, q, doc.ID, doc.Title, doc.CreatedAt, doc.UpdatedAt)
	var out domain.Document
	if err := row.Scan(&out.ID, &out.Title, &out.CreatedAt, &out.UpdatedAt); err != nil {
		return domain.Document{}, err
	}
	return out, nil
}

func (r *DocumentRepo) GetByID(ctx context.Context, id string) (domain.Document, error) {
	const q = `SELECT id, title, created_at, updated_at FROM docs WHERE id = $1`
	row := r.pool.QueryRow(ctx, q, id)
	var out domain.Document
	if err := row.Scan(&out.ID, &out.Title, &out.CreatedAt, &out.UpdatedAt); err != nil {
		if err == pgx.ErrNoRows {
			return domain.Document{}, domain.ErrNotFound
		}
		return domain.Document{}, err
	}
	return out, nil
}

func (r *DocumentRepo) UpdateTitle(ctx context.Context, id string, title string) (domain.Document, error) {
	const q = `
UPDATE docs
SET title = $2, updated_at = NOW()
WHERE id = $1
RETURNING id, title, created_at, updated_at`

	row := r.pool.QueryRow(ctx, q, id, title)
	var out domain.Document
	if err := row.Scan(&out.ID, &out.Title, &out.CreatedAt, &out.UpdatedAt); err != nil {
		if err == pgx.ErrNoRows {
			return domain.Document{}, domain.ErrNotFound
		}
		return domain.Document{}, err
	}
	return out, nil
}

func (r *DocumentRepo) Delete(ctx context.Context, id string) error {
	const q = `DELETE FROM docs WHERE id = $1`
	res, err := r.pool.Exec(ctx, q, id)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}
