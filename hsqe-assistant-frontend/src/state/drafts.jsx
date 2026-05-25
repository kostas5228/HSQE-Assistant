// src/state/drafts.jsx
//
// Persistent "new entry" draft store.
//
// Drafts are kept across navigation (in React state) AND across full page
// refresh (in localStorage). A draft is removed only when the user
// explicitly saves the entry or discards the draft.
//
// Usage:
//   const { draft, setDraft, clearDraft, hasDraft } = useDraft("tasks-new");
//
// The shape of `draft` is whatever object the form puts in. `null` means
// "no draft exists".

import React from "react";

const STORAGE_KEY = "hsqe_drafts_v1";

const DraftContext = React.createContext(null);

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveToStorage(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / privacy errors */
  }
}

export function DraftProvider({ children }) {
  const [drafts, setDrafts] = React.useState(() => loadFromStorage());

  // Keep localStorage in sync.
  React.useEffect(() => {
    saveToStorage(drafts);
  }, [drafts]);

  const api = React.useMemo(
    () => ({
      get(key) {
        return drafts[key] ?? null;
      },
      set(key, value) {
        setDrafts((prev) => {
          // Avoid useless re-renders / writes when nothing changed.
          try {
            if (JSON.stringify(prev[key]) === JSON.stringify(value)) return prev;
          } catch {
            /* fall through */
          }
          return { ...prev, [key]: value };
        });
      },
      clear(key) {
        setDrafts((prev) => {
          if (!(key in prev)) return prev;
          const { [key]: _drop, ...rest } = prev;
          return rest;
        });
      },
      clearAll() {
        setDrafts({});
      },
      // Snapshot of all keys (for debugging / UI badges).
      keys() {
        return Object.keys(drafts);
      },
    }),
    [drafts]
  );

  return <DraftContext.Provider value={api}>{children}</DraftContext.Provider>;
}

/**
 * useDraft(key)
 *
 * Returns:
 *   draft       – the persisted draft object, or null
 *   hasDraft    – boolean
 *   setDraft(v) – store/replace the draft
 *   clearDraft()– remove the draft (used on Save / Discard)
 */
export function useDraft(key) {
  const ctx = React.useContext(DraftContext);
  if (!ctx) {
    throw new Error("useDraft must be used inside <DraftProvider />");
  }

  const draft = ctx.get(key);

  const setDraft = React.useCallback((v) => ctx.set(key, v), [ctx, key]);
  const clearDraft = React.useCallback(() => ctx.clear(key), [ctx, key]);

  return {
    draft,
    hasDraft: draft != null,
    setDraft,
    clearDraft,
  };
}
