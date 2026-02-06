export type RecentDoc = {
  id: string;
  title: string;
  updatedAt: string;
};

const RECENT_KEY = "collabdocs_recent_docs";

export function loadRecentDocs(): RecentDoc[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentDoc[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((doc) => doc?.id && doc?.title && doc?.updatedAt);
  } catch {
    return [];
  }
}

export function saveRecentDoc(doc: RecentDoc) {
  const existing = loadRecentDocs();
  const without = existing.filter((item) => item.id !== doc.id);
  const next = [doc, ...without].slice(0, 9);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export function removeRecentDoc(id: string) {
  const existing = loadRecentDocs();
  const next = existing.filter((item) => item.id !== id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}
