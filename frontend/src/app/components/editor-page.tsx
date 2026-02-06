import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  List,
  ListOrdered,
  Code,
  MessageSquare,
  ArrowLeft,
  Check,
  Share2,
  Trash2,
} from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { motion } from "motion/react";
import { useQueryClient } from "@tanstack/react-query";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import UnderlineExtension from "@tiptap/extension-underline";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import toast from "react-hot-toast";
import { CommentsPanel } from "./comments-panel";
import { ExportMenu } from "./export-menu";
import { GuestJoinModal } from "./guest-join-modal";
import { useDoc, useUpdateDoc } from "@/features/docs/api";
import {
  Comment,
  useAddComment,
  useComments,
  useUpdateComment,
} from "@/features/comments/api";
import { useDocSocket, type PresencePayload } from "@/features/realtime/useDocSocket";
import { saveRecentDoc } from "@/lib/recentDocs";

interface Collaborator {
  name: string;
  color: string;
  isTyping: boolean;
}

const DISPLAY_NAME_KEY = "collabdocs_display_name";
const OWNER_KEY = "collabdocs_owner_docs";
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

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium border border-white shadow-sm cursor-pointer hover:scale-105 transition-transform"
            style={{ backgroundColor: color }}
          >
            {initials}
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-md shadow-lg"
            sideOffset={5}
          >
            {name}
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  isActive,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
}) {
  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            onClick={onClick}
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
              isActive
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-md shadow-lg"
            sideOffset={5}
          >
            {label}
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

function isOwner(docId?: string) {
  if (!docId) return false;
  const raw = localStorage.getItem(OWNER_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) && parsed.includes(docId);
  } catch {
    return false;
  }
}

function setOwner(docId: string) {
  const raw = localStorage.getItem(OWNER_KEY);
  const parsed = raw ? (JSON.parse(raw) as string[]) : [];
  const next = Array.isArray(parsed) ? parsed : [];
  if (!next.includes(docId)) {
    next.push(docId);
    localStorage.setItem(OWNER_KEY, JSON.stringify(next));
  }
}

export function EditorPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [documentTitle, setDocumentTitle] = useState("Untitled Document");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(() =>
    localStorage.getItem(DISPLAY_NAME_KEY)
  );
  const [presenceMap, setPresenceMap] = useState<
    Record<
      string,
      { presence: PresencePayload; lastSeen: number; lastTypingAt: number }
    >
  >({});
  const [localTyping, setLocalTyping] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);

  const ydoc = useMemo(() => new Y.Doc(), [documentId]);
  const awareness = useMemo(() => new Awareness(ydoc), [ydoc]);

  const { data: doc, isLoading: docLoading, error: docError } = useDoc(
    documentId
  );
  const updateDoc = useUpdateDoc();

  const commentsQuery = useComments(documentId);
  const addComment = useAddComment();
  const updateComment = useUpdateComment();

  const localColor = useMemo(
    () => (displayName ? hashToColor(displayName) : COLOR_PALETTE[0]),
    [displayName]
  );

  const handlePresence = useCallback((presence: PresencePayload) => {
    setPresenceMap((prev) => ({
      ...prev,
      [presence.name]: {
        presence,
        lastSeen: Date.now(),
        lastTypingAt: presence.typing ? Date.now() : 0,
      },
    }));
  }, []);

  const handleCommentAdd = useCallback(
    (comment: Comment) => {
      queryClient.setQueryData<Comment[]>(["comments", documentId], (prev) => {
        if (!prev) return [comment];
        if (prev.some((item) => item.id === comment.id)) return prev;
        return [comment, ...prev];
      });
    },
    [documentId, queryClient]
  );

  const handleCommentUpdate = useCallback(
    (comment: Comment) => {
      queryClient.setQueryData<Comment[]>(["comments", documentId], (prev) => {
        if (!prev) return [comment];
        return prev.map((item) => (item.id === comment.id ? comment : item));
      });
    },
    [documentId, queryClient]
  );

  const handleSocketError = useCallback((message: string) => {
    toast.error(message);
  }, []);

  const { isConnected, sendPresence, sendCommentAdd, sendCommentUpdate, sendSnapshot } =
    useDocSocket({
      docId: documentId,
      name: displayName ?? undefined,
      doc: ydoc,
      awareness,
      onPresence: handlePresence,
      onCommentAdd: handleCommentAdd,
      onCommentUpdate: handleCommentUpdate,
      onError: handleSocketError,
    });

  useEffect(() => {
    if (!isConnected || !doc) return;
    const interval = window.setInterval(() => {
      const update = Y.encodeStateAsUpdate(ydoc);
      if (update.length > 0) {
        sendSnapshot(update);
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [doc, isConnected, sendSnapshot, ydoc]);

  const editor = useEditor({
    extensions: [StarterKit, UnderlineExtension, Collaboration.configure({ document: ydoc })],
    editorProps: {
      attributes: {
        class:
          "w-full min-h-[700px] px-16 py-14 bg-white rounded-lg shadow-sm font-mono text-sm leading-relaxed transition-all relative z-10 focus:outline-none",
      },
    },
    autofocus: false,
    editable: false,
  });

  useEffect(() => {
    if (docError) {
      toast.error("Failed to load document");
    }
  }, [docError]);

  useEffect(() => {
    if (commentsQuery.error) {
      toast.error("Failed to load comments");
    }
  }, [commentsQuery.error]);

  useEffect(() => {
    if (!documentId) return;
    if (isOwner(documentId)) {
      if (!displayName) {
        setDisplayName("Owner");
        localStorage.setItem(DISPLAY_NAME_KEY, "Owner");
      }
      setGuestModalOpen(false);
      return;
    }
    if (!displayName) {
      setGuestModalOpen(true);
    }
  }, [displayName, documentId]);

  useEffect(() => {
    if (!doc) return;
    setDocumentTitle(doc.title);
    saveRecentDoc({ id: doc.id, title: doc.title, updatedAt: doc.updatedAt });
  }, [doc]);

  useEffect(() => {
    if (!doc || !documentTitle.trim()) return;
    if (documentTitle.trim() === doc.title) return;
    const timer = window.setTimeout(() => {
      updateDoc.mutate(
        { id: doc.id, title: documentTitle.trim() },
        {
          onSuccess: (updated) => {
            queryClient.setQueryData(["doc", updated.id], updated);
            saveRecentDoc({
              id: updated.id,
              title: updated.title,
              updatedAt: updated.updatedAt,
            });
          },
          onError: () => toast.error("Failed to update title"),
        }
      );
    }, 600);
    return () => window.clearTimeout(timer);
  }, [doc, documentTitle, updateDoc]);

  useEffect(() => {
    if (!editor) return;
    const canEdit = Boolean(displayName && isConnected);
    editor.setEditable(canEdit);
  }, [displayName, editor, isConnected]);

  useEffect(() => {
    if (!editor || !displayName) return;

    const handlePresenceUpdate = () => {
      const { from, to } = editor.state.selection;
      sendPresence({
        name: displayName,
        color: localColor,
        typing: localTyping,
        cursor: { from, to },
      });
      setPresenceMap((prev) => ({
        ...prev,
        [displayName]: {
          presence: {
            type: "presence",
            name: displayName,
            color: localColor,
            typing: localTyping,
            cursor: { from, to },
          },
          lastSeen: Date.now(),
          lastTypingAt: localTyping ? Date.now() : 0,
        },
      }));
    };

    const handleUpdate = () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      setLocalTyping(true);
      typingTimeoutRef.current = window.setTimeout(() => {
        setLocalTyping(false);
      }, 1200);
      handlePresenceUpdate();
    };

    const handleSelection = () => {
      handlePresenceUpdate();
    };

    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", handleSelection);

    handlePresenceUpdate();

    return () => {
      editor.off("update", handleUpdate);
      editor.off("selectionUpdate", handleSelection);
    };
  }, [editor, displayName, localColor, localTyping, sendPresence]);

  useEffect(() => {
    if (localTyping) return;
    if (!editor || !displayName) return;
    const { from, to } = editor.state.selection;
    sendPresence({
      name: displayName,
      color: localColor,
      typing: false,
      cursor: { from, to },
    });
  }, [displayName, editor, localColor, localTyping, sendPresence]);

  const collaborators: Collaborator[] = useMemo(() => {
    const now = Date.now();
    const values = Object.values(presenceMap)
      .filter((entry) => now - entry.lastSeen < 7000)
      .map((entry) => {
        const typingFresh = entry.lastTypingAt > 0 && now - entry.lastTypingAt < 1800;
        return {
          ...entry.presence,
          typing: typingFresh,
        };
      });
    if (values.length === 0 && displayName) {
      return [{ name: displayName, color: localColor, isTyping: localTyping }];
    }
    return values.map((presence) => ({
      name: presence.name,
      color: presence.color,
      isTyping: presence.typing,
    }));
  }, [displayName, localColor, localTyping, presenceMap]);

  const typingCollaborators = collaborators.filter(
    (c) => c.isTyping && c.name !== displayName
  );

  const handleGuestJoin = (name: string) => {
    localStorage.setItem(DISPLAY_NAME_KEY, name);
    setDisplayName(name);
    setGuestModalOpen(false);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied");
    } catch {
      toast.success("Share link ready: copy from address bar");
    }
  };

  const handleAddComment = async (text: string) => {
    if (!documentId) return;
    if (!displayName) {
      toast.error("Enter your name before commenting");
      return;
    }
    const selection = editor?.state.selection;
    if (!selection || selection.from === selection.to) {
      toast.error("Select some text to comment");
      return;
    }
    try {
      const comment = await addComment.mutateAsync({
        docId: documentId,
        authorName: displayName,
        fromPos: selection.from,
        toPos: selection.to,
        text,
      });
      queryClient.setQueryData<Comment[]>(["comments", documentId], (prev) => {
        if (!prev) return [comment];
        return [comment, ...prev];
      });
      sendCommentAdd(comment);
    } catch (error) {
      toast.error("Failed to add comment");
      console.error(error);
    }
  };

  const handleResolve = async (commentId: string) => {
    if (!documentId) return;
    try {
      const updated = await updateComment.mutateAsync({
        docId: documentId,
        commentId,
        resolved: true,
      });
      queryClient.setQueryData<Comment[]>(["comments", documentId], (prev) => {
        if (!prev) return [updated];
        return prev.map((item) => (item.id === updated.id ? updated : item));
      });
      sendCommentUpdate(updated);
    } catch (error) {
      toast.error("Failed to resolve comment");
      console.error(error);
    }
  };


  const isSavingTitle = updateDoc.isPending;
  const lastEdited = updateDoc.data?.updatedAt ?? doc?.updatedAt;
  const canAddComment = Boolean(
    editor && displayName && editor.state.selection.from !== editor.state.selection.to
  );

  if (!documentId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
        Document not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200/80 shadow-sm">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => navigate("/")}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-md hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={documentTitle}
                onChange={(event) => setDocumentTitle(event.target.value)}
                className="text-xl font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 px-2 py-1 rounded-md hover:bg-gray-50 w-full"
                disabled={docLoading}
              />
              <div className="text-xs text-gray-400 px-2 mt-0.5">
                {docLoading ? (
                  <span>Loading document...</span>
                ) : isSavingTitle ? (
                  <span>Saving...</span>
                ) : lastEdited ? (
                  <span>Last edited {new Date(lastEdited).toLocaleString()}</span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Share button */}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>

            {/* Save status indicator */}
            {!isSavingTitle && doc && documentTitle.trim() === doc.title && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Check className="w-3.5 h-3.5 text-green-600" />
              </div>
            )}

            {/* Collaborators */}
            <div className="flex items-center -space-x-1.5 pl-3 border-l border-gray-200">
              {collaborators.map((collab) => (
                <Avatar key={collab.name} name={collab.name} color={collab.color} />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-gray-50/80 border-b border-gray-200/80 px-8 py-2.5 flex items-center gap-1">
        {/* Text formatting group */}
        <div className="flex items-center gap-0.5 px-1">
          <ToolbarButton
            icon={Bold}
            label="Bold (⌘B)"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            isActive={editor?.isActive("bold")}
          />
          <ToolbarButton
            icon={Italic}
            label="Italic (⌘I)"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            isActive={editor?.isActive("italic")}
          />
          <ToolbarButton
            icon={Underline}
            label="Underline (⌘U)"
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            isActive={editor?.isActive("underline")}
          />
        </div>

        <div className="w-px h-5 bg-gray-300 mx-1.5" />

        {/* Lists and structure group */}
        <div className="flex items-center gap-0.5 px-1">
          <ToolbarButton
            icon={Heading2}
            label="Heading"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor?.isActive("heading", { level: 2 })}
          />
          <ToolbarButton
            icon={List}
            label="Bullet list"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            isActive={editor?.isActive("bulletList")}
          />
          <ToolbarButton
            icon={ListOrdered}
            label="Numbered list"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            isActive={editor?.isActive("orderedList")}
          />
          <ToolbarButton
            icon={Code}
            label="Code block"
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            isActive={editor?.isActive("codeBlock")}
          />
        </div>

        <div className="w-px h-5 bg-gray-300 mx-1.5" />

        {/* Collaboration group */}
        <div className="flex items-center gap-0.5 px-1">
          <ToolbarButton
            icon={MessageSquare}
            label="Comments"
            onClick={() => setCommentsOpen(!commentsOpen)}
            isActive={commentsOpen}
          />
        </div>

        {/* Typing indicator in toolbar */}
        {typingCollaborators.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="ml-4 text-xs text-gray-400 flex items-center gap-2"
          >
            <div className="flex gap-0.5">
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1 h-1 bg-gray-400 rounded-full"
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                className="w-1 h-1 bg-gray-400 rounded-full"
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                className="w-1 h-1 bg-gray-400 rounded-full"
              />
            </div>
            <span>{typingCollaborators[0].name} is typing...</span>
          </motion.div>
        )}

        <div className="ml-auto">
          <ExportMenu
            documentTitle={documentTitle}
            documentContent={editor?.getText() ?? ""}
          />
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex">
        <div className="flex-1 flex justify-center py-10 px-8">
          <div className="w-full max-w-[52rem] relative">
            {/* Page width guide - subtle visual */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="h-full mx-auto" style={{ width: "calc(100% - 8rem)" }}>
                <div className="h-full border-l border-r border-gray-100" />
              </div>
            </div>

            {docLoading ? (
              <div className="w-full min-h-[700px] px-16 py-14 bg-white rounded-lg shadow-sm border border-gray-200 text-sm text-gray-500">
                Loading editor...
              </div>
            ) : (
              <EditorContent
                editor={editor}
                className={`w-full min-h-[700px] rounded-lg transition-all relative z-10 ${
                  displayName && isConnected
                    ? "border border-gray-200 hover:border-gray-300"
                    : "border border-gray-200 opacity-70"
                }`}
              />
            )}
          </div>
        </div>

        {/* Comments Panel */}
        <CommentsPanel
          isOpen={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          comments={commentsQuery.data ?? []}
          isLoading={commentsQuery.isLoading}
          onResolve={handleResolve}
          onAdd={handleAddComment}
          canAdd={canAddComment}
        />

        {/* Guest Join Modal */}
        <GuestJoinModal
          isOpen={guestModalOpen}
          onClose={() => setGuestModalOpen(false)}
          onJoin={handleGuestJoin}
        />
      </div>
    </div>
  );
}
