import { FileText, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useCreateDoc } from "@/features/docs/api";
import {
  loadRecentDocs,
  removeRecentDoc,
  saveRecentDoc,
  type RecentDoc,
} from "@/lib/recentDocs";

interface Document {
  id: string;
  title: string;
  updatedAt: string;
  collaborators: { name: string; color: string }[];
}

function formatUpdatedAt(updatedAt: string) {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return updatedAt;
  return date.toLocaleString();
}

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white shadow-sm"
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials}
    </div>
  );
}

function DocumentCard({
  doc,
  onDelete,
}: {
  doc: Document;
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => {
        saveRecentDoc({ id: doc.id, title: doc.title, updatedAt: doc.updatedAt });
        navigate(`/doc/${doc.id}`);
      }}
      className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group relative"
    >
      <button
        onClick={(event) => {
          event.stopPropagation();
          onDelete(doc.id);
        }}
        className="absolute right-4 top-4 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        title="Remove from recent"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-4 mb-4">
        <div className="w-11 h-11 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-50 transition-colors">
          <FileText className="w-5 h-5 text-gray-500 group-hover:text-indigo-600 transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate mb-1 group-hover:text-indigo-700 transition-colors">
            {doc.title}
          </h3>
          <p className="text-sm text-gray-500">{formatUpdatedAt(doc.updatedAt)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        <Users className="w-3.5 h-3.5 text-gray-400" />
        <div className="flex items-center -space-x-1.5">
          {doc.collaborators.slice(0, 3).map((collab, idx) => (
            <Avatar key={idx} name={collab.name} color={collab.color} />
          ))}
          {doc.collaborators.length > 3 && (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 border-white bg-gray-200 text-gray-600 shadow-sm">
              +{doc.collaborators.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const createDoc = useCreateDoc();
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);

  useEffect(() => {
    setRecentDocs(loadRecentDocs());
  }, []);

  const documents = useMemo<Document[]>(
    () =>
      recentDocs.map((doc) => ({
        ...doc,
        collaborators: [],
      })),
    [recentDocs]
  );

  const handleCreate = async () => {
    try {
      const doc = await createDoc.mutateAsync({});
      saveRecentDoc(doc);
      const ownerRaw = localStorage.getItem("collabdocs_owner_docs");
      const ownerDocs = ownerRaw ? (JSON.parse(ownerRaw) as string[]) : [];
      const nextOwnerDocs = Array.isArray(ownerDocs) ? ownerDocs : [];
      if (!nextOwnerDocs.includes(doc.id)) {
        nextOwnerDocs.push(doc.id);
        localStorage.setItem("collabdocs_owner_docs", JSON.stringify(nextOwnerDocs));
      }
      setRecentDocs(loadRecentDocs());
      navigate(`/doc/${doc.id}`);
    } catch (error) {
      toast.error("Failed to create document");
      console.error(error);
    }
  };

  const handleDelete = (id: string) => {
    removeRecentDoc(id);
    setRecentDocs(loadRecentDocs());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="text-xl font-semibold text-gray-900">CollabDocs</div>
          <button
            onClick={handleCreate}
            disabled={createDoc.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md font-medium"
          >
            <Plus className="w-4 h-4" />
            {createDoc.isPending ? "Creating..." : "New Document"}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-8 pt-24 pb-16 text-center">
        <h1 className="text-5xl font-semibold text-gray-900 mb-5 tracking-tight">
          Real-time collaborative editor
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          Write together. Instantly. Anywhere.
        </p>
        <button
          onClick={handleCreate}
          disabled={createDoc.isPending}
          className="px-8 py-3.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-lg font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          {createDoc.isPending ? "Creating..." : "Create new document"}
        </button>
      </div>

      {/* Recent Documents */}
      <div className="max-w-7xl mx-auto px-8 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Recent documents
          </h2>
          <span className="text-sm text-gray-500">{documents.length} documents</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.length === 0 ? (
            <div className="col-span-full text-sm text-gray-500">
              No recent documents yet.
            </div>
          ) : (
            documents.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} onDelete={handleDelete} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
