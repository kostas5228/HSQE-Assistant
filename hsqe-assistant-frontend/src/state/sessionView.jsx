// src/state/sessionView.jsx
import React from "react";

const SessionViewContext = React.createContext(null);

function mergeDeep(prev, patch) {
  // shallow merge per page key
  return { ...prev, ...patch };
}

export function SessionViewProvider({ children }) {
  // ✅ In-memory only. Reset on full refresh/close.
  const [views, setViews] = React.useState({});

  const api = React.useMemo(() => {
    return {
      get(key, fallback) {
        return views[key] ?? fallback;
      },
      set(key, next) {
        setViews((prev) => ({ ...prev, [key]: next }));
      },
      patch(key, partial) {
        setViews((prev) => {
          const current = prev[key] ?? {};
          return { ...prev, [key]: mergeDeep(current, partial) };
        });
      },
      clear(key) {
        setViews((prev) => {
          const { [key]: _, ...rest } = prev;
          return rest;
        });
      },
      clearAll() {
        setViews({});
      },
    };
  }, [views]);

  return <SessionViewContext.Provider value={api}>{children}</SessionViewContext.Provider>;
}

export function useSessionView(key, defaults = {}) {
  const ctx = React.useContext(SessionViewContext);
  if (!ctx) {
    throw new Error("useSessionView must be used inside <SessionViewProvider />");
  }

  const value = ctx.get(key, defaults);

  const set = React.useCallback(
    (next) => {
      ctx.set(key, next);
    },
    [ctx, key]
  );

  const patch = React.useCallback(
    (partial) => {
      ctx.patch(key, partial);
    },
    [ctx, key]
  );

  return { value, set, patch, clear: () => ctx.clear(key) };
}

