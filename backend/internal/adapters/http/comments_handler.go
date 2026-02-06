package http

import (
	"encoding/json"
	"net/http"

	"collabdocs/internal/app/usecase"
	"github.com/go-chi/chi/v5"
)

type CommentsHandler struct {
	service *usecase.CommentService
}

func NewCommentsHandler(service *usecase.CommentService) *CommentsHandler {
	return &CommentsHandler{service: service}
}

type createCommentRequest struct {
	AuthorName string `json:"authorName"`
	FromPos    int    `json:"fromPos"`
	ToPos      int    `json:"toPos"`
	Text       string `json:"text"`
}

type updateCommentRequest struct {
	Resolved *bool  `json:"resolved"`
	Text     *string `json:"text"`
}

func (h *CommentsHandler) List(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	comments, err := h.service.ListByDoc(r.Context(), docID)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"comments": comments})
}

func (h *CommentsHandler) Create(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	var req createCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid JSON body")
		return
	}

	comment, err := h.service.Create(r.Context(), usecase.CreateCommentInput{
		DocID:      docID,
		AuthorName: req.AuthorName,
		FromPos:    req.FromPos,
		ToPos:      req.ToPos,
		Text:       req.Text,
	})
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"comment": comment})
}

func (h *CommentsHandler) Update(w http.ResponseWriter, r *http.Request) {
	docID := chi.URLParam(r, "id")
	commentID := chi.URLParam(r, "commentId")
	var req updateCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid JSON body")
		return
	}

	comment, err := h.service.Update(r.Context(), usecase.UpdateCommentInput{
		DocID:     docID,
		CommentID: commentID,
		Resolved:  req.Resolved,
		Text:      req.Text,
	})
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"comment": comment})
}
