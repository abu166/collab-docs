package repo

import (
	"context"

	"collabdocs/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SnapshotRepo struct {
	pool *pgxpool.Pool
}

func NewSnapshotRepo(pool *pgxpool.Pool) *SnapshotRepo {
	return &SnapshotRepo{pool: pool}
}

func (r *SnapshotRepo) GetSnapshot(ctx context.Context, docID string) ([]byte, error) {
	const q = `SELECT snapshot FROM doc_snapshots WHERE doc_id = $1`
	row := r.pool.QueryRow(ctx, q, docID)
	var snapshot []byte
	if err := row.Scan(&snapshot); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return snapshot, nil
}

func (r *SnapshotRepo) UpsertSnapshot(ctx context.Context, docID string, snapshot []byte) error {
	const q = `
INSERT INTO doc_snapshots (doc_id, snapshot, updated_at)
SELECT $1, $2, NOW()
WHERE EXISTS (SELECT 1 FROM docs WHERE id = $1)
ON CONFLICT (doc_id) DO UPDATE SET snapshot = EXCLUDED.snapshot, updated_at = NOW()`

	_, err := r.pool.Exec(ctx, q, docID, snapshot)
	return err
}

var _ = domain.ErrNotFound
