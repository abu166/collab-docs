import { Download, FileText, FileCode } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ExportMenuProps {
  documentTitle: string;
  documentContent: string;
}

export function ExportMenu({ documentTitle, documentContent }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const exportAsText = () => {
    const blob = new Blob([documentContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${documentTitle || "document"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  const exportAsMarkdown = () => {
    const blob = new Blob([documentContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${documentTitle || "document"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
      >
        <Download className="w-4 h-4" />
        Export
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1.5 z-50">
          <button
            onClick={exportAsText}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            <FileText className="w-4 h-4 text-gray-500" />
            <span>Export as .txt</span>
          </button>
          <div className="h-px bg-gray-100 my-1" />
          <button
            onClick={exportAsMarkdown}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            <FileCode className="w-4 h-4 text-gray-500" />
            <span>Export as .md</span>
          </button>
        </div>
      )}
    </div>
  );
}
