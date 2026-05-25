// src/components/GlobalSearchModal.jsx
import React from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";

import { useGlobalSearch } from "../state/globalSearch";
import {
  listTasks,
  listInspections,
  listInspectionReports,
  listCertificates,
  listDirectoryContacts,
} from "../api";
import { buildSearchIndex, groupResults, scoreItem } from "../utils/searchIndex";

const NOTES_KEY = "hsqe_notes_v1";

function loadNotesFromLS() {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function useKeyDown(handler, active = true) {
  React.useEffect(() => {
    if (!active) return;
    const onKeyDown = (e) => handler(e);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handler, active]);
}

export default function GlobalSearchModal() {
  const nav = useNavigate();
  const gs = useGlobalSearch();

  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: listTasks });
  const { data: inspections = [] } = useQuery({ queryKey: ["inspections"], queryFn: listInspections });
  const { data: inspectionReports = [] } = useQuery({ queryKey: ["inspectionReports"], queryFn: listInspectionReports });
  const { data: certificates = [] } = useQuery({ queryKey: ["certificates"], queryFn: listCertificates });
  const { data: contacts = [] } = useQuery({ queryKey: ["directoryContacts"], queryFn: listDirectoryContacts });

  // ✅ Notes from localStorage + live update when Tasks page changes notes
  const [notes, setNotes] = React.useState(() => loadNotesFromLS());
  React.useEffect(() => {
    const onChange = () => setNotes(loadNotesFromLS());
    window.addEventListener("storage", onChange);
    window.addEventListener("hsqe_notes_changed", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("hsqe_notes_changed", onChange);
    };
  }, []);

  const index = React.useMemo(() => {
    return buildSearchIndex({ tasks, inspections, inspectionReports, certificates, contacts, notes });
  }, [tasks, inspections, inspectionReports, certificates, contacts, notes]);

  // compute results when tokens change
  React.useEffect(() => {
    if (!gs.isOpen) return;

    if (!gs.tokens || gs.tokens.length === 0) {
      gs.setResults(null);
      gs.setSelectedKey(null);
      return;
    }

    const scored = [];
    for (const it of index) {
      const s = scoreItem(it, gs.tokens);
      if (s >= 0) scored.push({ ...it, score: s });
    }

    scored.sort((a, b) => b.score - a.score);

    const grouped = groupResults(scored, 7);
    gs.setResults({ grouped, flat: scored });
    gs.setSelectedKey(grouped?.[0]?.items?.[0]?.key || null);
  }, [gs.isOpen, gs.tokens, index]);

  const flatVisible = React.useMemo(() => {
    const g = gs.results?.grouped || [];
    const out = [];
    for (const grp of g) for (const it of grp.items) out.push(it);
    return out;
  }, [gs.results]);

  function close() {
    gs.close();
  }

  function goTo(item) {
    if (!item) return;
    gs.close();
    nav(item.route);
  }

  // ✅ Keep ONLY Ctrl/Cmd+K (do NOT touch Ctrl+F)
  useKeyDown(
    (e) => {
      const isK = (e.key || "").toLowerCase() === "k";
      const mod = e.metaKey || e.ctrlKey;
      if (mod && isK) {
        e.preventDefault();
        gs.isOpen ? gs.close() : gs.open();
      }
      if (gs.isOpen && e.key === "Escape") {
        e.preventDefault();
        gs.close();
      }
    },
    true
  );

  // focus + scroll restore
  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    if (!gs.isOpen) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = gs.scrollTop || 0;
    document.getElementById("global-search-input")?.focus?.();
  }, [gs.isOpen]);

  if (!gs.isOpen) return null;

  const panelMaxH = "min(520px, 70vh)";

  const overlay = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,23,0.55)",
        display: "grid",
        placeItems: "start center",
        padding: 16,
        zIndex: 200,
      }}
      onMouseDown={close}
    >
      <div
        style={{
          width: "min(760px, 100%)",
          background: "white",
          borderRadius: 18,
          boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
          overflow: "hidden",
          marginTop: 72,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 14px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ width: 34, height: 34, borderRadius: 12, background: "#f1f5f9", display: "grid", placeItems: "center" }}>
            <Search size={18} />
          </div>

          <input
            id="global-search-input"
            value={gs.query}
            onChange={(e) => gs.setQuery(e.target.value)}
            placeholder='Search everywhere… (comma = AND, e.g. "arc,australia")'
            style={{ flex: 1, border: "none", outline: "none", fontSize: 15, fontWeight: 800, color: "#0f172a" }}
          />

          {gs.query ? (
            <button
              onClick={() => gs.clear()}
              title="Clear"
              style={{
                border: "1px solid #e5e7eb",
                background: "white",
                borderRadius: 12,
                padding: "8px 10px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 900,
              }}
            >
              <X size={16} />
              Clear
            </button>
          ) : (
            <button
              onClick={close}
              title="Close"
              style={{
                border: "1px solid #e5e7eb",
                background: "white",
                borderRadius: 12,
                padding: "8px 10px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 900,
              }}
            >
              <X size={16} />
              Esc
            </button>
          )}
        </div>

        {/* Results */}
        <div
          ref={scrollRef}
          onScroll={(e) => gs.setScrollTop(e.currentTarget.scrollTop)}
          style={{ maxHeight: panelMaxH, overflow: "auto", padding: 12 }}
        >
          {!gs.tokens?.length ? (
            <div style={{ padding: 14, color: "#64748b", fontWeight: 800 }}>
              Type to search across **Tasks, Notes, Inspections, Certificates, Directory**. Use commas for multiple terms.
            </div>
          ) : !gs.results?.grouped?.length ? (
            <div style={{ padding: 14, color: "#64748b", fontWeight: 800 }}>No results.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {gs.results.grouped.map((grp) => (
                <div key={grp.type} style={{ border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ padding: "10px 12px", background: "#f8fafc", fontWeight: 950, color: "#0f172a" }}>
                    {grp.type}
                  </div>
                  <div style={{ display: "grid" }}>
                    {grp.items.map((it) => (
                      <button
                        key={it.key}
                        type="button"
                        onClick={() => goTo(it)}
                        style={{
                          textAlign: "left",
                          border: "none",
                          background: "white",
                          padding: "10px 12px",
                          borderTop: "1px solid #eef2f7",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontWeight: 950, color: "#0f172a" }}>{it.title}</div>
                        {it.subtitle ? <div style={{ color: "#64748b", fontWeight: 800, fontSize: 12 }}>{it.subtitle}</div> : null}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
