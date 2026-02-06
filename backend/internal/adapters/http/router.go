package http

import (
	"net/http"
	"strings"
	"time"

	"collabdocs/internal/adapters/ws"
	"collabdocs/internal/app/usecase"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
)

type RouterDeps struct {
	Logger          *zap.Logger
	CORSOrigins     string
	DocService      *usecase.DocumentService
	CommentService  *usecase.CommentService
	SnapshotService *usecase.SnapshotService
	WSHandler       *ws.Handler
}

func NewRouter(deps RouterDeps) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.Recoverer)
	r.Use(RequestLogger(deps.Logger))

	origins := strings.Split(deps.CORSOrigins, ",")
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   origins,
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	r.Get("/readyz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
	})

	r.Handle("/metrics", promhttp.Handler())

	docsHandler := NewDocsHandler(deps.DocService)
	commentsHandler := NewCommentsHandler(deps.CommentService)

	rest := chi.NewRouter()
	rest.Use(middleware.Timeout(15 * time.Second))

	rest.Route("/docs", func(r chi.Router) {
		r.Post("/", docsHandler.Create)
		r.Get("/{id}", docsHandler.Get)
		r.Patch("/{id}", docsHandler.Update)
		r.Delete("/{id}", docsHandler.Delete)

		r.Get("/{id}/comments", commentsHandler.List)
		r.Post("/{id}/comments", commentsHandler.Create)
		r.Patch("/{id}/comments/{commentId}", commentsHandler.Update)
	})

	r.Mount("/", rest)
	r.Get("/ws", deps.WSHandler.Handle)

	return r
}
