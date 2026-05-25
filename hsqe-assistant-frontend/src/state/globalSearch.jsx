// src/state/globalSearch.jsx
import React from "react";

const GlobalSearchContext = React.createContext(null);

function tokenizeCommaQuery(q) {
  return String(q || "")
    .split(",")
    .map((s) => s.trim().toLowerCase()) // Make tokens lowercase for case-insensitive search
    .filter(Boolean)
    .filter((t) => t.length >= 2);
}

export function GlobalSearchProvider({ children }) {
  const [isOpen, setIsOpen] = React.useState(false);

  // session state
  const [query, setQuery] = React.useState("");
  const [tokens, setTokens] = React.useState([]);
  const [results, setResults] = React.useState(null); // grouped
  const [selectedKey, setSelectedKey] = React.useState(null);
  const [scrollTop, setScrollTop] = React.useState(0);

  const api = React.useMemo(() => {
    return {
      isOpen,
      query,
      tokens,
      results,
      selectedKey,
      scrollTop,

      open() {
        setIsOpen(true);
      },
      close() {
        setIsOpen(false);
      },

      setQuery(next) {
        setQuery(next);
        const ts = tokenizeCommaQuery(next);
        setTokens(ts);
      },

      setResults(next) {
        setResults(next);
      },
      setSelectedKey(next) {
        setSelectedKey(next);
      },
      setScrollTop(next) {
        setScrollTop(next);
      },

      clear() {
        setQuery("");
        setTokens([]);
        setResults(null);
        setSelectedKey(null);
        setScrollTop(0);
      },
    };
  }, [isOpen, query, tokens, results, selectedKey, scrollTop]);

  return <GlobalSearchContext.Provider value={api}>{children}</GlobalSearchContext.Provider>;
}

export function useGlobalSearch() {
  const ctx = React.useContext(GlobalSearchContext);
  if (!ctx) throw new Error("useGlobalSearch must be used within GlobalSearchProvider");
  return ctx;
}
