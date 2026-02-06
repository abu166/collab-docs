import { useState } from "react";

interface GuestJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (name: string) => void;
}

export function GuestJoinModal({
  isOpen,
  onClose,
  onJoin,
}: GuestJoinModalProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name.trim());
      setName("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 border border-gray-200">
        {/* Header */}
        <div className="px-6 pt-6 pb-3">
          <h2 className="text-xl font-semibold text-gray-900 mb-1.5">
            Enter your name to start editing
          </h2>
          <p className="text-sm text-gray-500">
            Your name will be visible to other collaborators.
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="mb-5">
            <label
              htmlFor="name"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maria"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-gray-900 placeholder:text-gray-400"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 hover:shadow-md transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none font-semibold shadow-sm"
          >
            Start editing
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            You're joining via a shared link as a guest.
          </p>
        </form>
      </div>
    </div>
  );
}
