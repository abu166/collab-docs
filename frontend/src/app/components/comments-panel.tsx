import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Comment } from "@/features/comments/api";

interface CommentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  comments: Comment[];
  isLoading: boolean;
  onResolve: (commentId: string) => void;
  onAdd: (text: string) => void;
  canAdd: boolean;
}

const COLOR_PALETTE = ["#8B93FF", "#FF8BA7", "#6DDCBD", "#FBBF77", "#C4A1FF"];

function hashToColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[idx];
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function CommentsPanel({
  isOpen,
  onClose,
  comments,
  isLoading,
  onResolve,
  onAdd,
  canAdd,
}: CommentsPanelProps) {
  const [draft, setDraft] = useState("");

  if (!isOpen) return null;

  const activeComments = useMemo(
    () => comments.filter((c) => !c.resolved),
    [comments]
  );
  const resolvedComments = useMemo(
    () => comments.filter((c) => c.resolved),
    [comments]
  );

  return (
    <div className="fixed right-0 top-0 h-screen w-[22rem] bg-white border-l border-gray-200 shadow-xl flex flex-col z-10">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <h2 className="font-semibold text-gray-900">Comments</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-6 py-4 border-b border-gray-200">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Add comment
        </label>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          className="mt-2 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          placeholder={
            canAdd ? "Leave feedback for your team..." : "Select text to comment"
          }
          disabled={!canAdd}
        />
        <button
          onClick={() => {
            if (!draft.trim()) return;
            onAdd(draft.trim());
            setDraft("");
          }}
          disabled={!canAdd || !draft.trim()}
          className="mt-3 w-full px-3 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Add comment
        </button>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {isLoading && (
          <div className="text-sm text-gray-500">Loading comments...</div>
        )}
        {/* Active Comments */}
        {!isLoading && activeComments.length > 0 && (
          <div className="space-y-3">
            {activeComments.map((comment, idx) => (
              <div key={comment.id}>
                <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: hashToColor(comment.authorName) }}
                    />
                    <span className="font-semibold text-sm text-gray-900">
                      {comment.authorName}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {formatTimestamp(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed mb-3">
                    {comment.text}
                  </p>
                  <button
                    onClick={() => onResolve(comment.id)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
                  >
                    Resolve
                  </button>
                </div>
                {idx < activeComments.length - 1 && (
                  <div className="h-px bg-gray-100 my-3" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Resolved Comments */}
        {!isLoading && resolvedComments.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-gray-200">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Resolved
            </div>
            {resolvedComments.map((comment, idx) => (
              <div key={comment.id}>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full opacity-50"
                      style={{ backgroundColor: hashToColor(comment.authorName) }}
                    />
                    <span className="font-semibold text-sm text-gray-500">
                      {comment.authorName}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {formatTimestamp(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {comment.text}
                  </p>
                  <div className="mt-3 text-xs text-gray-400 font-medium flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Resolved
                  </div>
                </div>
                {idx < resolvedComments.length - 1 && (
                  <div className="h-px bg-gray-100 my-3" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
