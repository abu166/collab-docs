package http

import (
	"encoding/json"
	"net/http"

	"collabdocs/internal/app/usecase"
	"collabdocs/internal/domain"
	"github.com/go-chi/chi/v5"
)

type DocsHandler struct {
	service *usecase.DocumentService
}

func NewDocsHandler(service *usecase.DocumentService) *DocsHandler {
	return &DocsHandler{service: service}
}

type createDocRequest struct {
	Title string `json:"title"`
}

type updateDocRequest struct {
	Title string `json:"title"`
}

func (h *DocsHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createDocRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid JSON body")
		return
	}

	doc, err := h.service.Create(r.Context(), usecase.CreateDocumentInput{Title: req.Title})
	if err != nil {
		writeDomainError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, doc)
}

func (h *DocsHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	doc, err := h.service.Get(r.Context(), id)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, doc)
}

func (h *DocsHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req updateDocRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid JSON body")
		return
	}

	doc, err := h.service.UpdateTitle(r.Context(), usecase.UpdateDocumentInput{ID: id, Title: req.Title})
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, doc)
}

func (h *DocsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.service.Delete(r.Context(), usecase.DeleteDocumentInput{ID: id}); err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func writeDomainError(w http.ResponseWriter, err error) {
	switch err {
	case domain.ErrInvalidInput:
		writeError(w, http.StatusBadRequest, "invalid_input", "Invalid input")
	case domain.ErrNotFound:
		writeError(w, http.StatusNotFound, "not_found", "Not found")
	default:
		writeError(w, http.StatusInternalServerError, "internal_error", "Internal server error")
	}
}
