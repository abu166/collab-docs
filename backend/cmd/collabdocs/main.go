package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	httpadapter "collabdocs/internal/adapters/http"
	wsadapter "collabdocs/internal/adapters/ws"
	"collabdocs/internal/app/usecase"
	"collabdocs/internal/infrastructure/db"
	"collabdocs/internal/infrastructure/hub"
	"collabdocs/internal/infrastructure/repo"
	"collabdocs/pkg/config"
	"collabdocs/pkg/logger"
	"github.com/go-playground/validator/v10"
	"go.uber.org/zap"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}

	log, err := logger.New(cfg.LogLevel)
	if err != nil {
		panic(err)
	}
	defer log.Sync()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pool, err := db.NewPool(ctx, cfg.DBDSN)
	if err != nil {
		log.Fatal("db connection failed", zap.Error(err))
	}
	defer pool.Close()

	validate := validator.New()

	docRepo := repo.NewDocumentRepo(pool)
	commentRepo := repo.NewCommentRepo(pool)
	snapshotRepo := repo.NewSnapshotRepo(pool)
	updateRepo := repo.NewUpdateRepo(pool)

	docService := usecase.NewDocumentService(docRepo, validate)
	commentService := usecase.NewCommentService(commentRepo, validate)
	snapshotService := usecase.NewSnapshotService(snapshotRepo, updateRepo, validate)

	h := hub.NewHub()
	wsHandler := wsadapter.NewHandler(h, snapshotService, log, cfg.WSMaxBinBytes, cfg.WSMaxTextBytes)

	router := httpadapter.NewRouter(httpadapter.RouterDeps{
		Logger:          log,
		CORSOrigins:     cfg.CORSOrigins,
		DocService:      docService,
		CommentService:  commentService,
		SnapshotService: snapshotService,
		WSHandler:       wsHandler,
	})

	srv := &http.Server{
		Addr:         ":" + cfg.AppPort,
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 20 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Info("server started", zap.String("port", cfg.AppPort))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("server error", zap.Error(err))
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	log.Info("shutdown initiated")
	ctxShutdown, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()

	h.Shutdown()
	if err := srv.Shutdown(ctxShutdown); err != nil {
		log.Error("shutdown error", zap.Error(err))
	}
}
