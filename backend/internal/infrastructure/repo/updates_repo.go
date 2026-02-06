package repo

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type UpdateRepo struct {
	pool *pgxpool.Pool
}

func NewUpdateRepo(pool *pgxpool.Pool) *UpdateRepo {
	return &UpdateRepo{pool: pool}
}

func (r *UpdateRepo) AppendUpdate(ctx context.Context, docID string, update []byte) error {
	const q = `
INSERT INTO doc_updates (doc_id, update, created_at)
SELECT $1, $2, NOW()
WHERE EXISTS (SELECT 1 FROM docs WHERE id = $1)`
	_, err := r.pool.Exec(ctx, q, docID, update)
	return err
}
