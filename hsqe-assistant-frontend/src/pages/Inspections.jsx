// src/pages/Inspections.jsx
import {
  exportFindingsListPdf,
  exportInspectionReportsPdf,
  exportStatisticsPdf,
  exportStatisticsDashboardPdf,
  formatDateDDMMYYYY,
} from "../utils/pdf/exports";
import React from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import {
  Download,
  Plus,
  Filter,
  Settings as Gear,
  Pencil,
  Trash2,
  ChevronDown,
  Paperclip,
} from "lucide-react";
import { useLocation } from "react-router-dom";

import {
  getSettings,
  listInspections,
  listInspectionsPage,
  listInspectionsAll,
  createInspection,
  updateInspection,
  deleteInspection,
  listInspectionReports,
  listInspectionReportsPage,
  listInspectionReportsAll,
  createInspectionReport,
  updateInspectionReport,
  deleteInspectionReport,
} from "../api";
import { useDraft } from "../state/drafts";
import InfiniteScrollSentinel from "../components/InfiniteScrollSentinel.jsx";

import InspectionForm from "../components/InspectionForm.jsx";
import InspectionReportForm from "../components/InspectionReportForm.jsx";
import InspectionStats from "../components/InspectionStats.jsx";

// --------------------
// Helpers
// --------------------
function formatDMY(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function clampTextStyle(lines = 3) {
  return {
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    lineHeight: 1.35,
  };
}

function safeStr(v) {
  return (v ?? "").toString();
}

function normalizeKey(v, fallback = "—") {
  const s = safeStr(v).trim();
  return s ? s : fallback;
}

function inspectionTypeDisplay(
  it,
  { includeAuthority = true, includeFlag = true } = {}
) {
  const type = normalizeKey(it?.inspection_type, "—");
  const t = type.toLowerCase();

  if (t === "psc" && includeAuthority) {
    const auth = normalizeKey(it?.psc_authority, "");
    if (auth && auth !== "—") return `${type} - ${auth}`;
    return type;
  }

  if (t === "flag" && includeFlag) {
    const flag = normalizeKey(it?.flag_state, "");
    if (flag && flag !== "—") return `${type} - ${flag}`;
    return type;
  }

  return type;
}

// --------------------
// Search helpers (better local search)
// --------------------
function buildHaystack(obj, extraKeys = []) {
  const keys = [
    "date",
    "vessel",
    "inspection_type",
    "psc_authority",
    "flag_state",
    "place",
    "finding_type",
    "code",
    "cpa_number",
    "description",
    "corrective_action",
    "preventive_action",
    "inspector_name",
    "master",
    "chief_engineer",
    "notes",
    ...extraKeys,
  ];

  return keys
    .map((k) => (obj?.[k] ?? "").toString())
    .join(" ")
    .toLowerCase();
}

// tokens: split by spaces + commas (arc, australia -> ["arc","australia"])
function queryTokens(q) {
  return String(q || "")
    .toLowerCase()
    .split(/[\s,]+/g)
    .map((t) => t.trim())
    .filter(Boolean);
}


// --------------------
// ✅ Session view persistence (NO external hooks / NO crashing)
// --------------------
const VIEW_KEY = "inspections_view_v1";

function safeParseJSON(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadView() {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(VIEW_KEY);
  if (!raw) return null;
  const v = safeParseJSON(raw);
  if (!v || typeof v !== "object") return null;
  return v;
}

function saveView(obj) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(VIEW_KEY, JSON.stringify(obj));
  } catch {
    // ignore
  }
}

// --------------------
// Media query hook
// --------------------
function useMediaQuery(query) {
  const get = React.useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const [matches, setMatches] = React.useState(get);

  React.useEffect(() => {
    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);

    onChange();
    if (m.addEventListener) m.addEventListener("change", onChange);
    else m.addListener(onChange);

    return () => {
      if (m.removeEventListener) m.removeEventListener("change", onChange);
      else m.removeListener(onChange);
    };
  }, [query]);

  return matches;
}

// --------------------
// Modal
// --------------------
function Modal({ title, children, onClose, width = "min(980px, 100%)", headerRight = null }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 60,
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          width,
          background: "white",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flex: "0 0 auto",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900 }}>{title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {headerRight}
            <button
              onClick={onClose}
              style={{ border: "none", background: "transparent", fontSize: 18 }}
            >
              ✕
            </button>
          </div>
        </div>
        <div style={{ padding: 16, overflow: "auto" }}>{children}</div>
      </div>
    </div>
  );
}

// --------------------
// Context menu (portal)
// --------------------
function ContextMenu({ pos, items, onClose }) {
  React.useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    function onClick() {
      onClose();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  const w = 220;
  const x = Math.min(pos.x, window.innerWidth - w - 8);
  const y = Math.min(pos.y, window.innerHeight - 120 - 8);

  return createPortal(
    <div
      style={{
        position: "fixed",
        left: x,
        top: y,
        width: w,
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        boxShadow: "0 14px 40px rgba(0,0,0,0.18)",
        overflow: "hidden",
        zIndex: 9999,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {items.map((it, idx) => (
        <React.Fragment key={it.label}>
          <button
            type="button"
            onClick={() => {
              onClose();
              it.onClick();
            }}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "none",
              background: "white",
              textAlign: "left",
              display: "flex",
              gap: 10,
              alignItems: "center",
              cursor: "pointer",
              fontWeight: 800,
              color: it.danger ? "#b91c1c" : "#0f172a",
            }}
          >
            {it.icon}
            {it.label}
          </button>
          {idx !== items.length - 1 ? (
            <div style={{ height: 1, background: "#f1f5f9" }} />
          ) : null}
        </React.Fragment>
      ))}
    </div>,
    document.body
  );
}

// --------------------
// MultiSelect (portal dropdown)
// --------------------
function MultiSelect({ placeholder, options, value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef(null);
  const [rect, setRect] = React.useState(null);

  React.useEffect(() => {
    function onDoc(e) {
      if (anchorRef.current && anchorRef.current.contains(e.target)) return;
      setOpen(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  React.useEffect(() => {
    if (!open) return;

    function updateRect() {
      const r = anchorRef.current?.getBoundingClientRect?.();
      if (r) setRect(r);
    }

    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [open]);

  const selectedCount = Array.isArray(value) ? value.length : 0;
  const label = selectedCount === 0 ? placeholder : `${selectedCount} selected`;

  function toggle(opt) {
    const exists = value.includes(opt);
    const next = exists ? value.filter((x) => x !== opt) : [...value, opt];
    onChange(next);
  }

  const dropdown =
    open && rect
      ? createPortal(
          <div
            style={{
              position: "fixed",
              left: rect.left,
              top: rect.bottom + 4,
              width: rect.width,
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              boxShadow: "0 14px 40px rgba(0,0,0,0.12)",
              zIndex: 9999,
              overflow: "hidden",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={{ maxHeight: 260, overflow: "auto" }}>
              {options.length === 0 ? (
                <div style={{ padding: 12, color: "#64748b" }}>No options</div>
              ) : (
                options.map((opt) => {
                  const checked = value.includes(opt);
                  return (
                    <label
                      key={opt}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        padding: "10px 12px",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(opt)}
                      />
                      <span style={{ fontWeight: 800, color: "#0f172a" }}>
                        {opt}
                      </span>
                    </label>
                  );
                })
                )}
            </div>

            <div style={{ height: 1, background: "#f1f5f9" }} />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: 10,
              }}
            >
              <button
                type="button"
                onClick={() => onChange([])}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontWeight: 900,
                  color: "#0f172a",
                }}
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #0f172a",
                  background: "#0f172a",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={anchorRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%",
          height: 42,
          padding: "0 12px",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          background: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          fontWeight: 800,
          color: selectedCount ? "#0f172a" : "#475569",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        <ChevronDown size={18} />
      </button>

      {dropdown}
    </div>
  );
}

// --------------------
// Columns popover (List tab) - portal
// --------------------
function ColumnsPopover({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef(null);
  const [rect, setRect] = React.useState(null);

  React.useEffect(() => {
    function onDoc(e) {
      if (anchorRef.current && anchorRef.current.contains(e.target)) return;
      setOpen(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  React.useEffect(() => {
    if (!open) return;

    function updateRect() {
      const r = anchorRef.current?.getBoundingClientRect?.();
      if (r) setRect(r);
    }
    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [open]);

  const all = [
    { key: "date", label: "Date" },
    { key: "vessel", label: "Vessel" },
    { key: "inspection_type", label: "Type of inspection" },
    { key: "place", label: "Place of inspection" },

    { key: "finding_type", label: "Finding Type" },
    { key: "code", label: "Code" },
    { key: "description", label: "Description" },

    { key: "corrective_action", label: "Corrective Action" },
    { key: "preventive_action", label: "Preventive Action" },
    { key: "cpa_number", label: "CPA" },
  ];

  function toggle(k) {
    const set = new Set(value);
    if (set.has(k)) set.delete(k);
    else set.add(k);

    const ordered = all.map((x) => x.key).filter((key) => set.has(key));
    onChange(ordered);
  }

  const pop =
    open && rect
      ? createPortal(
          <div
            style={{
              position: "fixed",
              left: Math.min(rect.right - 280, window.innerWidth - 288),
              top: rect.bottom + 8,
              width: 280,
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              boxShadow: "0 14px 40px rgba(2,6,23,0.14)",
              padding: 10,
              zIndex: 9999,
              overflow: "hidden",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 900, marginBottom: 8 }}>
              Select columns
            </div>
            <div style={{ maxHeight: 320, overflow: "auto", paddingRight: 6 }}>
              {all.map((c) => {
                const checked = value.includes(c.key);
                return (
                  <label
                    key={c.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "6px 6px",
                      borderRadius: 10,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(c.key)}
                    />
                    <span style={{ fontWeight: 800 }}>{c.label}</span>
                  </label>
                );
              })}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={anchorRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          padding: "8px 12px",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          background: "white",
          fontWeight: 900,
          cursor: "pointer",
          display: "inline-flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <Gear size={16} /> Columns
      </button>
      {pop}
    </div>
  );
}

// --------------------
// Columns popover (Reports tab) - portal
// --------------------
function ReportColumnsPopover({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef(null);
  const [rect, setRect] = React.useState(null);

  React.useEffect(() => {
    function onDoc(e) {
      if (anchorRef.current && anchorRef.current.contains(e.target)) return;
      setOpen(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  React.useEffect(() => {
    if (!open) return;

    function updateRect() {
      const r = anchorRef.current?.getBoundingClientRect?.();
      if (r) setRect(r);
    }
    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [open]);

  const all = [
    { key: "date", label: "Date" },
    { key: "vessel", label: "Vessel" },
    { key: "inspection_type", label: "Type of inspection" },
    { key: "place", label: "Place of inspection" },
    { key: "detention", label: "Detention" },
    { key: "counts", label: "Counts" },
    { key: "files", label: "Files" },

    { key: "inspector_name", label: "Inspector Name" },
    { key: "master", label: "Master" },
    { key: "chief_engineer", label: "Chief Engineer" },
    { key: "notes", label: "Notes" },
  ];

  function toggle(k) {
    const set = new Set(value);
    if (set.has(k)) set.delete(k);
    else set.add(k);

    const ordered = all.map((x) => x.key).filter((key) => set.has(key));
    onChange(ordered);
  }

  const pop =
    open && rect
      ? createPortal(
          <div
            style={{
              position: "fixed",
              left: Math.min(rect.right - 280, window.innerWidth - 288),
              top: rect.bottom + 8,
              width: 280,
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              boxShadow: "0 14px 40px rgba(2,6,23,0.14)",
              padding: 10,
              zIndex: 9999,
              overflow: "hidden",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 900, marginBottom: 8 }}>
              Select columns
            </div>
            <div style={{ maxHeight: 320, overflow: "auto", paddingRight: 6 }}>
              {all.map((c) => {
                const checked = value.includes(c.key);
                return (
                  <label
                    key={c.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "6px 6px",
                      borderRadius: 10,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(c.key)}
                    />
                    <span style={{ fontWeight: 800 }}>{c.label}</span>
                  </label>
                );
              })}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={anchorRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          padding: "8px 12px",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          background: "white",
          fontWeight: 900,
          cursor: "pointer",
          display: "inline-flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <Gear size={16} /> Columns
      </button>
      {pop}
    </div>
  );
}

// --------------------
// Text cell
// --------------------
function TextCell({ value, lines = 3, label, item, onOpen }) {
  const txt = (value ?? "").toString();
  const hasText = txt.trim().length > 0;

  const payload = {
    title: label,
    description: item?.description || "",
    corrective_action: item?.corrective_action || "",
    preventive_action: item?.preventive_action || "",
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(payload)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen?.(payload);
      }}
      style={{
        ...clampTextStyle(lines),
        cursor: "pointer",
      }}
      title="Open full text"
    >
      {hasText ? txt : "—"}
    </div>
  );
}

// --------------------
// List Row (table)
// --------------------
// Reusable long-press hook for touch devices (iPad/iOS).
// Uses Pointer Events API — works on both mouse and touch.
function useLongPress(onTrigger, delay = 520) {
  const timer = React.useRef(null);
  const startXY = React.useRef({ x: 0, y: 0 });
  const moved = React.useRef(false);

  function clear() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }

  return {
    onPointerDown(e) {
      if (e.pointerType === "mouse") return;
      moved.current = false;
      startXY.current = { x: e.clientX, y: e.clientY };
      clear();
      timer.current = setTimeout(() => {
        if (!moved.current) onTrigger({ x: e.clientX, y: e.clientY });
      }, delay);
    },
    onPointerMove(e) {
      if (!timer.current) return;
      const dx = Math.abs(e.clientX - startXY.current.x);
      const dy = Math.abs(e.clientY - startXY.current.y);
      if (dx > 8 || dy > 8) moved.current = true;
    },
    onPointerUp: clear,
    onPointerCancel: clear,
  };
}

function ListRow({ item, columns, onOpenMenu, onOpenText, highlight }) {
  const tdBase = {
    padding: "12px 14px",
    borderBottom: "1px solid #e5e7eb",
    verticalAlign: "top",
    fontSize: 14,
    color: "#0f172a",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const highlightStyle = highlight
    ? {
        background: "rgba(59,130,246,0.10)",
        outline: "2px solid rgba(59,130,246,0.35)",
        outlineOffset: -2,
      }
    : null;

  function cell(key) {
    switch (key) {
      case "date":
        return formatDMY(item.date);

      case "vessel":
        return <span style={{ fontWeight: 900 }}>{item.vessel || "—"}</span>;

      case "inspection_type":
        return inspectionTypeDisplay(item, {
          includeAuthority: true,
          includeFlag: true,
        });

      case "place":
        return item.place || "—";

      case "finding_type":
        return item.finding_type || "—";

      case "code":
        return item.code?.trim() ? (
          <span style={{ fontWeight: 900 }}>{item.code}</span>
        ) : (
          "—"
        );

      case "description":
        return (
          <TextCell
            label="Description"
            item={item}
            value={item.description}
            lines={3}
            onOpen={onOpenText}
          />
        );

      case "cpa_number":
        return item.cpa_number || "—";

      case "corrective_action":
        return (
          <TextCell
            label="Corrective Action"
            item={item}
            value={item.corrective_action}
            lines={3}
            onOpen={onOpenText}
          />
        );

      case "preventive_action":
        return (
          <TextCell
            label="Preventive Action"
            item={item}
            value={item.preventive_action}
            lines={3}
            onOpen={onOpenText}
          />
        );

      default:
        return "—";
    }
  }

  const longPress = useLongPress((pos) => onOpenMenu(pos, item));

  return (
    <tr
      data-row-id={String(item.id)}
      style={{ cursor: "context-menu", ...(highlightStyle || {}) }}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenMenu({ x: e.clientX, y: e.clientY }, item);
      }}
      onPointerDown={longPress.onPointerDown}
      onPointerMove={longPress.onPointerMove}
      onPointerUp={longPress.onPointerUp}
      onPointerCancel={longPress.onPointerCancel}
      onMouseEnter={(e) => {
        if (!highlight) e.currentTarget.style.background = "#f8fafc";
      }}
      onMouseLeave={(e) => {
        if (!highlight) e.currentTarget.style.background = "white";
      }}
    >
      {columns.map((k) => (
        <td key={k} style={tdBase}>
          {cell(k)}
        </td>
      ))}
    </tr>
  );
}

// --------------------
// Compact card row
// --------------------
function CompactListCard({ item, onOpenMenu, onOpenText, highlight }) {
  const highlightStyle = highlight
    ? {
        background: "rgba(59,130,246,0.08)",
        outline: "2px solid rgba(59,130,246,0.35)",
        outlineOffset: -2,
      }
    : null;

  const longPress = useLongPress((pos) => onOpenMenu(pos, item));

  return (
    <div
      data-row-id={String(item.id)}
      style={{
        borderBottom: "1px solid #e5e7eb",
        padding: 12,
        display: "grid",
        gap: 10,
        cursor: "context-menu",
        ...(highlightStyle || {}),
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenMenu({ x: e.clientX, y: e.clientY }, item);
      }}
      onPointerDown={longPress.onPointerDown}
      onPointerMove={longPress.onPointerMove}
      onPointerUp={longPress.onPointerUp}
      onPointerCancel={longPress.onPointerCancel}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 950, color: "#0f172a" }}>
          {item.vessel || "—"}
        </div>
        <div style={{ color: "#64748b", fontWeight: 900 }}>
          {formatDMY(item.date)}
        </div>
      </div>

      <div style={{ display: "grid", gap: 6, color: "#0f172a" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              fontWeight: 950,
              border: "1px solid #e5e7eb",
              borderRadius: 999,
              padding: "4px 10px",
              background: "#f8fafc",
            }}
          >
            {inspectionTypeDisplay(item, {
              includeAuthority: true,
              includeFlag: true,
            })}
          </span>

          <span
            style={{
              fontWeight: 900,
              border: "1px solid #e5e7eb",
              borderRadius: 999,
              padding: "4px 10px",
              background: "white",
              color: "#334155",
            }}
          >
            {item.place?.trim() ? item.place : "—"}
          </span>

          {item.finding_type?.trim() ? (
            <span
              style={{
                fontWeight: 900,
                border: "1px solid #e5e7eb",
                borderRadius: 999,
                padding: "4px 10px",
                background: "white",
                color: "#334155",
              }}
            >
              {item.finding_type}
            </span>
          ) : null}

          {item.code?.trim() ? (
            <span
              style={{
                fontWeight: 950,
                border: "1px solid #0f172a",
                borderRadius: 999,
                padding: "4px 10px",
                background: "#0f172a",
                color: "white",
              }}
            >
              {item.code}
            </span>
          ) : null}
        </div>

        <TextCell
          label="Description"
          item={item}
          value={item.description}
          lines={4}
          onOpen={onOpenText}
        />
      </div>
    </div>
  );
}

// --------------------
// Small UI elements
// --------------------
function ReportRow({ it, highlight, reportColumns, renderReportCell, openMenuReport }) {
  const longPress = useLongPress((pos) => openMenuReport(pos, it));

  return (
    <tr
      data-row-id={String(it.id)}
      style={{
        cursor: "context-menu",
        ...(highlight
          ? { background: "rgba(59,130,246,0.10)", outline: "2px solid rgba(59,130,246,0.35)", outlineOffset: -2 }
          : null),
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        openMenuReport({ x: e.clientX, y: e.clientY }, it);
      }}
      onPointerDown={longPress.onPointerDown}
      onPointerMove={longPress.onPointerMove}
      onPointerUp={longPress.onPointerUp}
      onPointerCancel={longPress.onPointerCancel}
      onMouseEnter={(e) => {
        if (!highlight) e.currentTarget.style.background = "#f8fafc";
      }}
      onMouseLeave={(e) => {
        if (!highlight) e.currentTarget.style.background = "white";
      }}
    >
      {reportColumns.map((k) => renderReportCell(it, k))}
    </tr>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        background: "white",
        padding: 16,
      }}
    >
      <div style={{ display: "grid", gap: 4, marginBottom: 12 }}>
        <div style={{ fontWeight: 950, color: "#0f172a" }}>{title}</div>
        {subtitle ? (
          <div style={{ color: "#64748b", fontWeight: 800, fontSize: 13 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

// --------------------
// Page
// --------------------
export default function Inspections() {
  const qc = useQueryClient();
  const location = useLocation();
    // ✅ Settings dropdown options (from Settings tab)
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const vesselsOptions = Array.isArray(settingsData?.vessels) ? settingsData.vessels : [];
  const inspectionTypesOptions = Array.isArray(settingsData?.inspectionTypes)
    ? settingsData.inspectionTypes
    : [];

   
  const isCompact = useMediaQuery("(max-width: 900px)");
  const isMobile = useMediaQuery("(max-width: 640px)");

  const [mainTab, setMainTab] = React.useState("list"); // list | reports | stats

  // Deep-link focus + highlight (from Dashboard)
  const [focusId, setFocusId] = React.useState(null);
  const [highlightId, setHighlightId] = React.useState(null);
  const [highlightKind, setHighlightKind] = React.useState(null); // finding | report | null

  // LIST filters
  const [tab, setTab] = React.useState("search"); // search | date
  const [q, setQ] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [vessels, setVessels] = React.useState([]);
  const [types, setTypes] = React.useState([]);

    
  const [columns, setColumns] = React.useState([
    "date",
    "vessel",
    "inspection_type",
    "place",
    "code",
    "description",
  ]);

  const [sortKey, setSortKey] = React.useState("date");
  const [sortDir, setSortDir] = React.useState("desc");

  const [showNew, setShowNew] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [confirmDelete, setConfirmDelete] = React.useState(null);

  const [ctx, setCtx] = React.useState(null);
  const [textModal, setTextModal] = React.useState(null);

  // REPORTS filters
  const [rTab, setRTab] = React.useState("search"); // search | date
  const [rq, setRq] = React.useState("");
  const [rFrom, setRFrom] = React.useState("");
  const [rTo, setRTo] = React.useState("");
  const [rVessels, setRVessels] = React.useState([]);
  const [rTypes, setRTypes] = React.useState([]);

  // ✅ BONUS: if Settings options change, clear invalid selections in filters
  React.useEffect(() => {
    setVessels((prev) =>
      Array.isArray(prev) ? prev.filter((x) => vesselsOptions.includes(x)) : []
    );
    setRVessels((prev) =>
      Array.isArray(prev) ? prev.filter((x) => vesselsOptions.includes(x)) : []
    );
  }, [vesselsOptions]);

  React.useEffect(() => {
    setTypes((prev) =>
      Array.isArray(prev)
        ? prev.filter((x) => inspectionTypesOptions.includes(x))
        : []
    );
    setRTypes((prev) =>
      Array.isArray(prev)
        ? prev.filter((x) => inspectionTypesOptions.includes(x))
        : []
    );
  }, [inspectionTypesOptions]);

  const [reportColumns, setReportColumns] = React.useState([
    "date",
    "vessel",
    "inspection_type",
    "place",
    "detention",
    "counts",
    "files",
  ]);

  const [rSortKey, setRSortKey] = React.useState("date");
  const [rSortDir, setRSortDir] = React.useState("desc");

  const [showNewReport, setShowNewReport] = React.useState(false);
  const [editingReport, setEditingReport] = React.useState(null);
  const [confirmDeleteReport, setConfirmDeleteReport] = React.useState(null);
  const [ctxReport, setCtxReport] = React.useState(null);

  // Drafts: keep "New Inspection" / "New Report" data across navigation.
  const {
    draft: inspectionDraft,
    setDraft: setInspectionDraft,
    clearDraft: clearInspectionDraft,
  } = useDraft("inspections-new");
  const {
    draft: reportDraft,
    setDraft: setReportDraft,
    clearDraft: clearReportDraft,
  } = useDraft("inspections-new-report");

  // Auto-reopen modals if a draft exists when the page mounts.
  React.useEffect(() => {
    if (inspectionDraft) setShowNew(true);
    if (reportDraft) setShowNewReport(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [attachmentsModal, setAttachmentsModal] = React.useState(null);

  // ✅ Hydrate from sessionStorage ONCE
  const hydratedRef = React.useRef(false);
  React.useEffect(() => {
    if (hydratedRef.current) return;

    const v = loadView();
    if (v) {
      if (typeof v.mainTab === "string") setMainTab(v.mainTab);

      if (typeof v.tab === "string") setTab(v.tab);
      if (typeof v.q === "string") setQ(v.q);
      if (typeof v.from === "string") setFrom(v.from);
      if (typeof v.to === "string") setTo(v.to);
      if (Array.isArray(v.vessels)) setVessels(v.vessels.filter(Boolean));
      if (Array.isArray(v.types)) setTypes(v.types.filter(Boolean));
      if (Array.isArray(v.columns) && v.columns.length > 0) setColumns(v.columns);
      if (typeof v.sortKey === "string") setSortKey(v.sortKey);
      if (typeof v.sortDir === "string") setSortDir(v.sortDir);

      if (typeof v.rTab === "string") setRTab(v.rTab);
      if (typeof v.rq === "string") setRq(v.rq);
      if (typeof v.rFrom === "string") setRFrom(v.rFrom);
      if (typeof v.rTo === "string") setRTo(v.rTo);
      if (Array.isArray(v.rVessels)) setRVessels(v.rVessels.filter(Boolean));
      if (Array.isArray(v.rTypes)) setRTypes(v.rTypes.filter(Boolean));
      if (Array.isArray(v.reportColumns) && v.reportColumns.length > 0) setReportColumns(v.reportColumns);
      if (typeof v.rSortKey === "string") setRSortKey(v.rSortKey);
      if (typeof v.rSortDir === "string") setRSortDir(v.rSortDir);
    }

    hydratedRef.current = true;
  }, []);

  // ✅ Persist view state (tabs/filters/columns/sort) safely
  React.useEffect(() => {
    if (!hydratedRef.current) return;

    saveView({
      mainTab,

      tab,
      q,
      from,
      to,
      vessels,
      types,
      columns,
      sortKey,
      sortDir,

      rTab,
      rq,
      rFrom,
      rTo,
      rVessels,
      rTypes,
      reportColumns,
      rSortKey,
      rSortDir,
    });
  }, [
    mainTab,
    tab,
    q,
    from,
    to,
    vessels,
    types,
    columns,
    sortKey,
    sortDir,
    rTab,
    rq,
    rFrom,
    rTo,
    rVessels,
    rTypes,
    reportColumns,
    rSortKey,
    rSortDir,
  ]);

  // ----- Incremental loading (cursor pagination, 30 per page) -----
  // Server-side filter+sort args. They participate in the query key, so
  // changing any filter resets pagination automatically.
  const PAGE_SIZE = 30;

  const listFilters = React.useMemo(
    () => ({ vessels, types, tab, q, from, to }),
    [vessels, types, tab, q, from, to]
  );
  const listSort = React.useMemo(
    () => ({ key: sortKey, dir: sortDir }),
    [sortKey, sortDir]
  );

  const reportsFilters = React.useMemo(
    () => ({ vessels: rVessels, types: rTypes, tab: rTab, q: rq, from: rFrom, to: rTo }),
    [rVessels, rTypes, rTab, rq, rFrom, rTo]
  );
  const reportsSort = React.useMemo(
    () => ({ key: rSortKey, dir: rSortDir }),
    [rSortKey, rSortDir]
  );

  // Used by InfiniteScrollSentinel as the IntersectionObserver root.
  const listScrollRef = React.useRef(null);
  const reportsScrollRef = React.useRef(null);
  // Force a re-render once after mount so the sentinel binds to the real DOM
  // node (refs alone don't trigger a re-render).
  const [, _bumpSentinels] = React.useState(0);
  React.useEffect(() => {
    _bumpSentinels((x) => x + 1);
  }, []);

  // --- LIST tab (Findings) ---
  const {
    data: listPagesData,
    isLoading: listIsLoading,
    isFetchingNextPage: listIsFetchingNextPage,
    hasNextPage: listHasNextPage,
    fetchNextPage: listFetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["inspections-page", listFilters, listSort, PAGE_SIZE],
    queryFn: ({ pageParam = null }) =>
      listInspectionsPage({
        cursor: pageParam,
        limit: PAGE_SIZE,
        filters: listFilters,
        sort: listSort,
      }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? null,
    enabled: mainTab !== "stats", // saves a fetch when user goes straight to stats
    staleTime: 30_000,
  });

  // Flattened, server-filtered, server-sorted rows for the List tab.
  const inspections = React.useMemo(() => {
    const pages = listPagesData?.pages || [];
    return pages.flatMap((p) => p?.items || []);
  }, [listPagesData]);
  const inspectionsTotal = listPagesData?.pages?.[0]?.total ?? inspections.length;
  const isLoading = listIsLoading;

  // --- REPORTS tab ---
  const {
    data: reportsPagesData,
    isLoading: reportsIsLoading,
    isFetchingNextPage: reportsIsFetchingNextPage,
    hasNextPage: reportsHasNextPage,
    fetchNextPage: reportsFetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["inspection_reports-page", reportsFilters, reportsSort, PAGE_SIZE],
    queryFn: ({ pageParam = null }) =>
      listInspectionReportsPage({
        cursor: pageParam,
        limit: PAGE_SIZE,
        filters: reportsFilters,
        sort: reportsSort,
      }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? null,
    enabled: mainTab !== "stats",
    staleTime: 30_000,
  });

  const reports = React.useMemo(() => {
    const pages = reportsPagesData?.pages || [];
    return pages.flatMap((p) => p?.items || []);
  }, [reportsPagesData]);
  const reportsTotal = reportsPagesData?.pages?.[0]?.total ?? reports.length;
  const reportsLoading = reportsIsLoading;

  // --- STATS tab needs the FULL datasets. Fetch them lazily, only when
  //     the Stats tab is the active one, so the database isn't touched
  //     unnecessarily while the user is browsing List/Reports.
  const { data: inspectionsAll = [] } = useQuery({
    queryKey: ["inspections"],
    queryFn: listInspections,
    enabled: mainTab === "stats",
    staleTime: 60_000,
  });
  const { data: reportsAll = [] } = useQuery({
    queryKey: ["inspection_reports"],
    queryFn: listInspectionReports,
    enabled: mainTab === "stats",
    staleTime: 60_000,
  });

  // Read query params (?tab=reports&focus=ID)
  React.useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const tabParam = (sp.get("tab") || "").toLowerCase();
    const focusParam = sp.get("focus");

    if (tabParam === "reports") setMainTab("reports");
    else if (tabParam === "stats") setMainTab("stats");
    else if (tabParam === "list") setMainTab("list");

    

    if (focusParam) {
      setFocusId(String(focusParam));
      setHighlightId(String(focusParam));
      setHighlightKind(tabParam === "reports" ? "report" : "finding");

      window.clearTimeout(window.__inspections_focus_t);
      window.__inspections_focus_t = window.setTimeout(() => {
        setHighlightId(null);
        setHighlightKind(null);
      }, 4000);
    } else {
      setFocusId(null);
      setHighlightId(null);
      setHighlightKind(null);
    }
  }, [location.search]);

  // LIST mutations
  const createMut = useMutation({
    mutationFn: createInspection,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["inspections"] });
      await qc.invalidateQueries({ queryKey: ["inspections-page"] });
      clearInspectionDraft();
      setShowNew(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, input }) => updateInspection(id, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["inspections"] });
      await qc.invalidateQueries({ queryKey: ["inspections-page"] });
      setEditing(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteInspection,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["inspections"] });
      await qc.invalidateQueries({ queryKey: ["inspections-page"] });
      setConfirmDelete(null);
    },
  });

  // REPORT mutations
  const createReportMut = useMutation({
    mutationFn: createInspectionReport,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["inspection_reports"] });
      await qc.invalidateQueries({ queryKey: ["inspection_reports-page"] });
      clearReportDraft();
      setShowNewReport(false);
    },
  });

  const updateReportMut = useMutation({
    mutationFn: ({ id, input }) => updateInspectionReport(id, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["inspection_reports"] });
      await qc.invalidateQueries({ queryKey: ["inspection_reports-page"] });
      setEditingReport(null);
    },
  });

  const deleteReportMut = useMutation({
    mutationFn: deleteInspectionReport,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["inspection_reports"] });
      await qc.invalidateQueries({ queryKey: ["inspection_reports-page"] });
      setConfirmDeleteReport(null);
    },
  });

  function clearAllListFilters() {
    setTab("search");
    setQ("");
    setFrom("");
    setTo("");
    setVessels([]);
    setTypes([]);
  }

  function clearAllReportFilters() {
    setRTab("search");
    setRq("");
    setRFrom("");
    setRTo("");
    setRVessels([]);
    setRTypes([]);
  }

  // LIST: server-side filter+sort already happened (see useInfiniteQuery
  // above); `filtered` is just an alias for the loaded rows.
  const filtered = inspections;

  // REPORTS helpers (counts)
  function getReportCounts(report) {
    const c =
      report?.counts && typeof report.counts === "object" ? report.counts : null;

    if (c) {
      const entries = Object.entries(c)
        .map(([k, v]) => [k, Number(v || 0)])
        .filter(([, v]) => Number.isFinite(v) && v >= 0);

      if (entries.length > 0) return Object.fromEntries(entries);
    }

    return {
      Deficiency: Number(report?.deficiencies ?? 0),
      Recommendation: Number(report?.recommendations ?? 0),
      Finding: Number(report?.findings ?? 0),
      Observation: Number(report?.observations ?? 0),
      Other: Number(report?.other ?? 0),
    };
  }

  function sumCounts(countsObj) {
    return Object.values(countsObj || {}).reduce(
      (s, v) => s + (Number(v) || 0),
      0
    );
  }

  function toAbbrevLabel(k) {
    const map = {
      Deficiency: "D",
      Deficiencies: "D",
      Recommendation: "R",
      Recommendations: "R",
      Finding: "F",
      Findings: "F",
      Observation: "O",
      Observations: "O",
      Other: "Other",
    };
    return map[k] || k;
  }

  // REPORTS: server-side filter+sort already happened (see useInfiniteQuery
  // above); `filteredReports` is just an alias for the loaded rows.
  const filteredReports = reports;

  // Scroll to focused row
  React.useEffect(() => {
    if (!focusId) return;

    const shouldBeInReports = highlightKind === "report";
    const shouldBeInList = highlightKind === "finding";

    if (shouldBeInReports && mainTab !== "reports") return;
    if (shouldBeInList && mainTab !== "list") return;

    const t = window.setTimeout(() => {
      const sel = `[data-row-id="${String(focusId).replace(/"/g, '\\"')}"]`;
      const el = document.querySelector(sel);
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 60);

    return () => window.clearTimeout(t);
  }, [focusId, highlightKind, mainTab, filtered.length, filteredReports.length, isCompact]);

  // UI helpers
  function openMenu(pos, item) {
    setCtx({ x: pos.x, y: pos.y, item });
  }
  function openMenuReport(pos, item) {
    setCtxReport({ x: pos.x, y: pos.y, item });
  }

  const th = {
    textAlign: "left",
    fontSize: 12,
    color: "#334155",
    fontWeight: 900,
    padding: "10px 12px",
    borderBottom: "1px solid #e5e7eb",
    background: "#f8fafc",
    position: "sticky",
    top: 0,
    zIndex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    cursor: "pointer",
    userSelect: "none",
  };

  function headerLabel(key) {
    const map = {
      date: "Date",
      vessel: "Vessel",
      inspection_type: "Type of inspection",
      place: "Place of inspection",
      finding_type: "Finding Type",
      code: "Code",
      description: "Description",
      cpa_number: "CPA",
      corrective_action: "Corrective Action",
      preventive_action: "Preventive Action",
    };
    return map[key] || key;
  }

  function colWidth(key) {
    const map = {
      date: 90,
      vessel: 120,
      inspection_type: 190,
      place: 170,
      finding_type: 150,
      code: 70,
      description: 400,
      corrective_action: 260,
      preventive_action: 260,
      cpa_number: 90,
    };
    return map[key] || 150;
  }

  function reportHeaderLabel(key) {
    const map = {
      date: "Date",
      vessel: "Vessel",
      inspection_type: "Type of inspection",
      place: "Place of inspection",
      inspector_name: "Inspector Name",
      detention: "Detention",
      counts: "Counts",
      master: "Master",
      chief_engineer: "Chief Engineer",
      notes: "Notes",
      files: "Files",
    };
    return map[key] || key;
  }

  function reportColWidth(key) {
    const map = {
      date: 90,
      vessel: 140,
      inspection_type: 190,
      place: 170,
      detention: 70,
      counts: 180,
      files: 70,

      inspector_name: 200,
      master: 180,
      chief_engineer: 200,
      notes: 340,
    };
    return map[key] || 160;
  }

  function sortGlyph(activeKey, k, dir) {
    if (activeKey !== k) return "";
    return dir === "asc" ? " ▲" : " ▼";
  }

  function toggleSort(currentKey, currentDir, setKey, setDir, nextKey) {
    if (currentKey !== nextKey) {
      setKey(nextKey);
      setDir("asc");
      return;
    }
    setDir(currentDir === "asc" ? "desc" : "asc");
  }

  const topTabsWrap = {
    display: "inline-flex",
    gap: 8,
    background: "#f1f5f9",
    padding: 4,
    borderRadius: 12,
    flexWrap: "wrap",
  };

  const topTabBtn = (active) => ({
    padding: "8px 12px",
    borderRadius: 10,
    border: "none",
    background: active ? "white" : "transparent",
    fontWeight: 950,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    color: "#0f172a",
    whiteSpace: "nowrap",
  });

  function detentionSquare(yes) {
    return (
      <div
        style={{
          width: 20,
          height: 20,
          border: "2px solid #0f172a",
          borderRadius: 5,
          display: "grid",
          placeItems: "center",
          margin: "0 auto",
          fontWeight: 999,
          lineHeight: 1,
          color: yes ? "#b91c1c" : "#0f172a",
          background: yes ? "rgba(185, 28, 28, 0.06)" : "white",
        }}
        title={yes ? "Detention: Yes" : "Detention: No"}
      >
        {yes ? "✓" : "✕"}
      </div>
    );
  }

  function renderReportCell(it, key) {
    const tdBase = {
      padding: "10px 12px",
      borderBottom: "1px solid #e5e7eb",
      verticalAlign: "top",
      color: "#0f172a",
      fontSize: 14,
      overflow: "hidden",
      textOverflow: "ellipsis",
    };

    const counts = getReportCounts(it);
    const totalCounts = sumCounts(counts);
    const attCount = Array.isArray(it.attachments) ? it.attachments.length : 0;

    switch (key) {
      case "date":
        return <td style={tdBase}>{formatDMY(it.date)}</td>;

      case "vessel":
        return (
          <td style={{ ...tdBase, fontWeight: 950 }}>{it.vessel || "—"}</td>
        );

      case "inspection_type":
        return (
          <td style={tdBase}>
            {inspectionTypeDisplay(it, {
              includeAuthority: true,
              includeFlag: true,
            })}
          </td>
        );

      case "place":
        return <td style={tdBase}>{it.place?.trim() ? it.place : "—"}</td>;

      case "inspector_name":
        return (
          <td style={tdBase}>
            {it.inspector_name?.trim() ? it.inspector_name : "—"}
          </td>
        );

      case "detention": {
        const yes = Boolean(it.detention);
        const type = (it.inspection_type || "").toLowerCase();
        const rawCost =
          type === "psc" ? it?.cost : type === "flag" ? it?.total_cost : null;
        const numericCost = Number(rawCost);
        const showCost = Number.isFinite(numericCost) && numericCost > 0;
        const label = type === "psc" ? "Cost" : type === "flag" ? "Total" : "";

        return (
          <td style={{ ...tdBase, textAlign: "center" }}>
            <div
              style={{
                display: "grid",
                justifyItems: "center",
                gap: showCost ? 6 : 0,
              }}
            >
              {detentionSquare(yes)}
              {showCost ? (
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 950,
                    color: "#0f172a",
                    lineHeight: 1.1,
                  }}
                >
                  <span style={{ color: "#64748b", fontWeight: 900 }}>
                    {label}:
                  </span>{" "}
                  {numericCost}
                </div>
              ) : null}
            </div>
          </td>
        );
      }

      case "counts": {
        if (totalCounts === 0) {
          return (
            <td style={tdBase}>
              <span style={{ color: "#64748b", fontWeight: 900 }}>—</span>
            </td>
          );
        }

        const nonZero = Object.entries(counts)
          .filter(([, v]) => Number(v || 0) > 0)
          .sort(([a], [b]) => String(a).localeCompare(String(b)));

        const shown = nonZero.slice(0, 4);
        const more = nonZero.length - shown.length;

        return (
          <td style={tdBase}>
            <div style={{ display: "grid", gap: 6 }}>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  fontSize: 13,
                }}
              >
                {shown.map(([k, v]) => (
                  <span key={k} style={{ fontWeight: 950 }}>
                    {toAbbrevLabel(k)}: {v}
                  </span>
                ))}
                {more > 0 ? (
                  <span style={{ color: "#64748b", fontWeight: 950 }}>
                    +{more} more
                  </span>
                ) : null}
              </div>
              <div
                style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}
              >
                Total: {totalCounts}
              </div>
            </div>
          </td>
        );
      }

      case "master":
        return <td style={tdBase}>{it.master?.trim() ? it.master : "—"}</td>;

      case "chief_engineer":
        return (
          <td style={tdBase}>
            {it.chief_engineer?.trim() ? it.chief_engineer : "—"}
          </td>
        );

      case "notes":
        return (
          <td style={tdBase}>
            <div style={{ ...clampTextStyle(4), color: "#0f172a" }}>
              {it.notes?.trim() ? it.notes : "—"}
            </div>
          </td>
        );

      case "files":
        return (
          <td style={{ ...tdBase, textAlign: "center" }}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setAttachmentsModal({
                  title: `Attachments • ${it.vessel || "—"} • ${formatDMY(
                    it.date
                  )}`,
                  attachments: Array.isArray(it.attachments)
                    ? it.attachments
                    : [],
                });
              }}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 950,
                color: "#0f172a",
                justifyContent: "center",
              }}
              title="Open attachments"
            >
              <Paperclip size={16} />
              {attCount}
            </button>
          </td>
        );

      default:
        return <td style={tdBase}>—</td>;
    }
  }

  // =========================
  // PDF Export (List / Reports / Stats)
  // =========================
  const listHasActiveFilters =
    vessels.length > 0 ||
    types.length > 0 ||
    (tab === "search" ? q.trim() !== "" : !!from || !!to);

  const reportsHasActiveFilters =
    rVessels.length > 0 ||
    rTypes.length > 0 ||
    (rTab === "search" ? rq.trim() !== "" : !!rFrom || !!rTo);

  // Findings List: columns come from "columns" state (user-selected)
  function getFindingCellText(item, key) {
    switch (key) {
      case "date":
        return formatDateDDMMYYYY(item?.date);
      case "vessel":
        return item?.vessel || "—";
      case "inspection_type":
        return inspectionTypeDisplay(item, {
          includeAuthority: true,
          includeFlag: true,
        });
      case "place":
        return item?.place || "—";
      case "finding_type":
        return item?.finding_type || "—";
      case "code":
        return item?.code || "—";
      case "description":
        return item?.description || "—";
      case "corrective_action":
        return item?.corrective_action || "—";
      case "preventive_action":
        return item?.preventive_action || "—";
      case "cpa_number":
        return item?.cpa_number || "—";
      default:
        return "—";
    }
  }

  function getReportCellText(it, key) {
    switch (key) {
      case "date":
        return formatDateDDMMYYYY(it?.date);
      case "vessel":
        return it?.vessel || "—";
      case "inspection_type":
        return inspectionTypeDisplay(it, {
          includeAuthority: true,
          includeFlag: true,
        });
      case "place":
        return it?.place || "—";
      case "detention":
        return it?.detention ? "Yes" : "No";
      case "counts": {
        const counts = getReportCounts(it);
        const total = sumCounts(counts);
        if (!total) return "—";
        const nonZero = Object.entries(counts)
          .filter(([, v]) => Number(v || 0) > 0)
          .sort(([a], [b]) => String(a).localeCompare(String(b)));
        return nonZero.map(([k, v]) => `${toAbbrevLabel(k)}:${v}`).join("  ");
      }
      case "files":
        return String(Array.isArray(it?.attachments) ? it.attachments.length : 0);
      case "inspector_name":
        return it?.inspector_name || "—";
      case "master":
        return it?.master || "—";
      case "chief_engineer":
        return it?.chief_engineer || "—";
      case "notes":
        return it?.notes || "—";
      default:
        return "—";
    }
  }

  async function handleExportPdf() {
    // LIST TAB (Findings List)
    if (mainTab === "list") {
      // The visible list is paginated; fetch the full datasets on demand so
      // the PDF contains every matching record, not just what's been
      // scrolled into view.
      const [allRows, filteredRows] = await Promise.all([
        listInspectionsAll({ filters: {}, sort: listSort }),
        listInspectionsAll({ filters: listFilters, sort: listSort }),
      ]);

      const listPxWidths = columns.map((k) => colWidth(k));
      const listTotalPx = listPxWidths.reduce((s, w) => s + w, 0);
      const listHasLongText = columns.some((k) =>
        ["description", "corrective_action", "preventive_action", "notes"].includes(k)
      );
      // Long-text columns need landscape width (285mm = 297-12); otherwise portrait (198mm = 210-12).
      const listUsableW = listHasLongText ? 285 : 198;
      const listColWidths = listPxWidths.map((w) =>
        Math.max(12, Math.round((w / listTotalPx) * listUsableW))
      );

      exportFindingsListPdf({
        hasActiveFilters: listHasActiveFilters,
        allRows,
        filteredRows,
        columns,
        headerLabels: Object.fromEntries(columns.map((k) => [k, headerLabel(k)])),
        colWidthsMM: listColWidths,
        getCellText: getFindingCellText,
      });
      return;
    }

    // REPORTS TAB
    if (mainTab === "reports") {
      const [allRows, filteredRows] = await Promise.all([
        listInspectionReportsAll({ filters: {}, sort: reportsSort }),
        listInspectionReportsAll({ filters: reportsFilters, sort: reportsSort }),
      ]);

      const rptPxWidths = reportColumns.map((k) => reportColWidth(k));
      const rptTotalPx = rptPxWidths.reduce((s, w) => s + w, 0);
      const rptHasLongText = reportColumns.some((k) =>
        ["notes", "counts"].includes(k)
      );
      const rptUsableW = rptHasLongText ? 285 : 198;
      const rptColWidths = rptPxWidths.map((w) =>
        Math.max(12, Math.round((w / rptTotalPx) * rptUsableW))
      );

      exportInspectionReportsPdf({
        hasActiveFilters: reportsHasActiveFilters,
        allRows,
        filteredRows,
        columns: reportColumns,
        headerLabels: Object.fromEntries(reportColumns.map((k) => [k, reportHeaderLabel(k)])),
        colWidthsMM: rptColWidths,
        getCellText: getReportCellText,
      });
      return;
    }

    // STATS TAB (export the actual Statistics UI with charts)
    if (mainTab === "stats") {
      // ✅ FIX: correct id
      const el = document.getElementById("stats-export-root");

      if (!el) {
        window.alert("Stats export failed: #stats-export-root not found.");
        return;
      }

      await exportStatisticsDashboardPdf({
        element: el,
        orientation: "p",
      });

      return;
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Top tabs */}
      <div style={topTabsWrap}>
        <button type="button" onClick={() => setMainTab("list")} style={topTabBtn(mainTab === "list")}>
          List
        </button>
        <button type="button" onClick={() => setMainTab("reports")} style={topTabBtn(mainTab === "reports")}>
          Inspection Reports
        </button>
        <button type="button" onClick={() => setMainTab("stats")} style={topTabBtn(mainTab === "stats")}>
          Statistics
        </button>
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: isCompact ? "flex-start" : "center",
          flexDirection: isCompact ? "column" : "row",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: isMobile ? 26 : 34, fontWeight: 980, color: "#0f172a" }}>
            Inspections & Findings
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={handleExportPdf}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #1e3a8a",
              background: "white",
              fontWeight: 900,
              display: "inline-flex",
              gap: 8,
              alignItems: "center",
              cursor: "pointer",
              color: "#0f172a",
            }}
          >
            <Download size={18} /> Export
          </button>

          {mainTab === "list" ? (
            <button
              onClick={() => setShowNew(true)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #1e3a8a",
                background: "#1e3a8a",
                color: "white",
                fontWeight: 950,
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <Plus size={18} /> New Inspection Finding
            </button>
          ) : mainTab === "reports" ? (
            <button
              onClick={() => setShowNewReport(true)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #1e3a8a",
                background: "#1e3a8a",
                color: "white",
                fontWeight: 950,
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <Plus size={18} /> New Inspection Report
            </button>
          ) : null}
        </div>
      </div>

      {/* ===================== LIST TAB ===================== */}
      {mainTab === "list" ? (
        <>
          <Card>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 950, color: "#0f172a" }}>
                <Filter size={18} /> Active Filters
              </div>

              <button
                type="button"
                onClick={clearAllListFilters}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#0f172a",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Clear All
              </button>
            </div>

            <div style={{ display: "inline-flex", gap: 8, background: "#f1f5f9", padding: 4, borderRadius: 12 }}>
              <button type="button" onClick={() => setTab("search")} style={topTabBtn(tab === "search")}>
                Search
              </button>
              <button type="button" onClick={() => setTab("date")} style={topTabBtn(tab === "date")}>
                Date Range
              </button>
            </div>

            {tab === "search" ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1.2fr 1fr 1fr",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                <input
                  placeholder="Search across all fields..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  style={{
                    height: 42,
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    padding: "0 12px",
                    outline: "none",
                    fontWeight: 800,
                  }}
                />

                <MultiSelect placeholder="Vessels" options={vesselsOptions} value={vessels} onChange={setVessels} />
                <MultiSelect placeholder="Type of inspection" options={inspectionTypesOptions} value={types} onChange={setTypes} />

              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr 1fr",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  style={{
                    height: 42,
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    padding: "0 12px",
                    outline: "none",
                    fontWeight: 800,
                  }}
                />
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  style={{
                    height: 42,
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    padding: "0 12px",
                    outline: "none",
                    fontWeight: 800,
                  }}
                />
                <MultiSelect placeholder="Vessels" options={vesselsOptions} value={vessels} onChange={setVessels} />
              </div>
            )}
          </Card>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", background: "white" }}>
            <div
              style={{
                padding: 12,
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontWeight: 950, color: "#0f172a" }}>
                Results
                <span style={{ marginLeft: 10, color: "#64748b", fontWeight: 900, fontSize: 13 }}>
                  {filtered.length} record{filtered.length === 1 ? "" : "s"}
                </span>
              </div>
              <ColumnsPopover value={columns} onChange={setColumns} />
            </div>

            {isCompact ? (
              <div ref={listScrollRef} style={{ maxHeight: "62vh", overflow: "auto" }}>
                {isLoading ? (
                  <div style={{ padding: 16, color: "#64748b", fontWeight: 800 }}>Loading...</div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: 16, color: "#64748b", fontWeight: 800 }}>No records found.</div>
                ) : (
                  filtered.map((it) => (
                    <CompactListCard
                      key={it.id}
                      item={it}
                      highlight={highlightKind === "finding" && String(highlightId) === String(it.id)}
                      onOpenMenu={(pos, item) => openMenu(pos, item)}
                      onOpenText={(payload) => setTextModal(payload)}
                    />
                  ))
                )}

                {/* Incremental loading sentinel */}
                {!isLoading && filtered.length > 0 ? (
                  <>
                    <InfiniteScrollSentinel
                      root={listScrollRef.current}
                      enabled={!!listHasNextPage && !listIsFetchingNextPage}
                      onIntersect={() => listFetchNextPage()}
                    />
                    <div style={{ padding: "10px 16px", textAlign: "center", color: "#64748b", fontSize: 12 }}>
                      {listIsFetchingNextPage
                        ? "Loading more…"
                        : listHasNextPage
                        ? `Scroll to load more (${filtered.length} of ${inspectionsTotal})`
                        : `All ${inspectionsTotal} loaded`}
                    </div>
                  </>
                ) : null}
              </div>
            ) : (
              <div ref={listScrollRef} style={{ maxHeight: "62vh", overflow: "auto" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                    <colgroup>
                      {columns.map((k) => (
                        <col key={k} style={{ width: colWidth(k) }} />
                      ))}
                    </colgroup>

                    <thead>
                      <tr>
                        {columns.map((k) => (
                          <th
                            key={k}
                            style={th}
                            onClick={() => toggleSort(sortKey, sortDir, setSortKey, setSortDir, k)}
                            title="Sort"
                          >
                            {headerLabel(k)}
                            {sortGlyph(sortKey, k, sortDir)}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={columns.length} style={{ padding: 16, color: "#64748b", fontWeight: 800 }}>
                            Loading...
                          </td>
                        </tr>
                      ) : filtered.length === 0 ? (
                        <tr>
                          <td colSpan={columns.length} style={{ padding: 16, color: "#64748b", fontWeight: 800 }}>
                            No records found.
                          </td>
                        </tr>
                      ) : (
                        filtered.map((it) => (
                          <ListRow
                            key={it.id}
                            item={it}
                            columns={columns}
                            highlight={highlightKind === "finding" && String(highlightId) === String(it.id)}
                            onOpenMenu={(pos, item) => openMenu(pos, item)}
                            onOpenText={(payload) => setTextModal(payload)}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Incremental loading sentinel */}
                {!isLoading && filtered.length > 0 ? (
                  <>
                    <InfiniteScrollSentinel
                      root={listScrollRef.current}
                      enabled={!!listHasNextPage && !listIsFetchingNextPage}
                      onIntersect={() => listFetchNextPage()}
                    />
                    <div style={{ padding: "10px 16px", textAlign: "center", color: "#64748b", fontSize: 12 }}>
                      {listIsFetchingNextPage
                        ? "Loading more…"
                        : listHasNextPage
                        ? `Scroll to load more (${filtered.length} of ${inspectionsTotal})`
                        : `All ${inspectionsTotal} loaded`}
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* Full details modal */}
          {textModal ? (
            <Modal title={textModal.title || "Details"} onClose={() => setTextModal(null)} width="min(860px, 100%)">
              <div style={{ display: "grid", gap: 14, color: "#0f172a", overflowX: "hidden" }}>
                {[

                  { label: "Description", value: textModal.description },
                  { label: "Corrective Action", value: textModal.corrective_action },
                  { label: "Preventive Action", value: textModal.preventive_action },
                ].map((sec) => (
                  <div key={sec.label} style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontWeight: 950 }}>{sec.label}</div>
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                      {sec.value?.trim() ? sec.value : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </Modal>
          ) : null}

          {/* Context Menu */}
          {ctx ? (
            <ContextMenu
              pos={{ x: ctx.x, y: ctx.y }}
              onClose={() => setCtx(null)}
              items={[
                { label: "Edit", icon: <Pencil size={16} />, onClick: () => setEditing(ctx.item) },
                { label: "Delete", icon: <Trash2 size={16} />, danger: true, onClick: () => setConfirmDelete(ctx.item) },
              ]}
            />
          ) : null}

          {/* New */}
          {showNew ? (
            <Modal
              title="New Inspection & Finding"
              onClose={() => setShowNew(false)}
              headerRight={
                inspectionDraft ? (
                  <button
                    type="button"
                    onClick={() => {
                      clearInspectionDraft();
                      setShowNew(false);
                    }}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      color: "#b91c1c",
                      fontWeight: 800,
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                    title="Discard draft"
                  >
                    Discard draft
                  </button>
                ) : null
              }
            >
              <InspectionForm
                initial={inspectionDraft || {}}
                saving={createMut.isPending}
                onCancel={() => setShowNew(false)}
                onSave={(data) => createMut.mutate(data)}
                onDraftChange={(data) => setInspectionDraft(data)}
              />
            </Modal>
          ) : null}

          {/* Edit */}
          {editing ? (
            <Modal title="Edit Inspection & Finding" onClose={() => setEditing(null)}>
              <InspectionForm
                initial={editing}
                saving={updateMut.isPending}
                onCancel={() => setEditing(null)}
                onSave={(data) => updateMut.mutate({ id: editing.id, input: data })}
              />
            </Modal>
          ) : null}

          {/* Delete confirm */}
          {confirmDelete ? (
            <Modal title="Confirm Delete" onClose={() => setConfirmDelete(null)} width="min(720px, 100%)">
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ color: "#0f172a", fontWeight: 950 }}>Are you sure you want to delete this record?</div>
                <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>
                  {formatDMY(confirmDelete.date)} • {confirmDelete.vessel || "—"} • {inspectionTypeDisplay(confirmDelete)}
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(null)}
                    style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", background: "white", fontWeight: 900, cursor: "pointer" }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={deleteMut.isPending}
                    onClick={() => deleteMut.mutate(confirmDelete.id)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid #7f1d1d",
                      background: "#b91c1c",
                      color: "white",
                      fontWeight: 950,
                      cursor: deleteMut.isPending ? "not-allowed" : "pointer",
                      opacity: deleteMut.isPending ? 0.85 : 1,
                    }}
                  >
                    {deleteMut.isPending ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </Modal>
          ) : null}
        </>
      ) : null}

      {/* ===================== REPORTS TAB ===================== */}
      {mainTab === "reports" ? (
        <>
          <Card>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 950, color: "#0f172a" }}>
                <Filter size={18} /> Active Filters
              </div>

              <button
                type="button"
                onClick={clearAllReportFilters}
                style={{ border: "none", background: "transparent", color: "#0f172a", fontWeight: 900, cursor: "pointer" }}
              >
                Clear All
              </button>
            </div>

            <div style={{ display: "inline-flex", gap: 8, background: "#f1f5f9", padding: 4, borderRadius: 12 }}>
              <button type="button" onClick={() => setRTab("search")} style={topTabBtn(rTab === "search")}>
                Search
              </button>
              <button type="button" onClick={() => setRTab("date")} style={topTabBtn(rTab === "date")}>
                Date Range
              </button>
            </div>

            {rTab === "search" ? (
              <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "1.2fr 1fr 1fr", gap: 12, marginTop: 12 }}>
                <input
                  placeholder="Search reports..."
                  value={rq}
                  onChange={(e) => setRq(e.target.value)}
                  style={{ height: 42, borderRadius: 10, border: "1px solid #e5e7eb", padding: "0 12px", outline: "none", fontWeight: 800 }}
                />
                <MultiSelect placeholder="Vessels" options={vesselsOptions} value={rVessels} onChange={setRVessels} />
                <MultiSelect placeholder="Type of inspection" options={inspectionTypesOptions} value={rTypes} onChange={setRTypes} />

              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
                <input
                  type="date"
                  value={rFrom}
                  onChange={(e) => setRFrom(e.target.value)}
                  style={{ height: 42, borderRadius: 10, border: "1px solid #e5e7eb", padding: "0 12px", outline: "none", fontWeight: 800 }}
                />
                <input
                  type="date"
                  value={rTo}
                  onChange={(e) => setRTo(e.target.value)}
                  style={{ height: 42, borderRadius: 10, border: "1px solid #e5e7eb", padding: "0 12px", outline: "none", fontWeight: 800 }}
                />
                <MultiSelect placeholder="Vessels" options={vesselsOptions} value={rVessels} onChange={setRVessels} />
              </div>
            )}
          </Card>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", background: "white" }}>
            <div
              style={{
                padding: 12,
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontWeight: 950, color: "#0f172a" }}>
                Inspection Reports
                <span style={{ marginLeft: 10, color: "#64748b", fontWeight: 900, fontSize: 13 }}>
                  {filteredReports.length} record{filteredReports.length === 1 ? "" : "s"}
                </span>
              </div>

              <ReportColumnsPopover value={reportColumns} onChange={setReportColumns} />
            </div>

            <div ref={reportsScrollRef} style={{ maxHeight: "62vh", overflow: "auto" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <colgroup>
                    {reportColumns.map((k) => (
                      <col key={k} style={{ width: reportColWidth(k) }} />
                    ))}
                  </colgroup>

                  <thead>
                    <tr>
                      {reportColumns.map((k) => (
                        <th
                          key={k}
                          style={th}
                          onClick={() => toggleSort(rSortKey, rSortDir, setRSortKey, setRSortDir, k)}
                          title="Sort"
                        >
                          {reportHeaderLabel(k)}
                          {sortGlyph(rSortKey, k, rSortDir)}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {reportsLoading ? (
                      <tr>
                        <td colSpan={reportColumns.length} style={{ padding: 16, color: "#64748b", fontWeight: 800 }}>
                          Loading...
                        </td>
                      </tr>
                    ) : filteredReports.length === 0 ? (
                      <tr>
                        <td colSpan={reportColumns.length} style={{ padding: 16, color: "#64748b", fontWeight: 800 }}>
                          No reports found.
                        </td>
                      </tr>
                    ) : (
                      filteredReports.map((it) => {
                        const highlight = highlightKind === "report" && String(highlightId) === String(it.id);
                        return (
                          <ReportRow
                            key={it.id}
                            it={it}
                            highlight={highlight}
                            reportColumns={reportColumns}
                            renderReportCell={renderReportCell}
                            openMenuReport={openMenuReport}
                          />
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Incremental loading sentinel */}
              {!reportsLoading && filteredReports.length > 0 ? (
                <>
                  <InfiniteScrollSentinel
                    root={reportsScrollRef.current}
                    enabled={!!reportsHasNextPage && !reportsIsFetchingNextPage}
                    onIntersect={() => reportsFetchNextPage()}
                  />
                  <div style={{ padding: "10px 16px", textAlign: "center", color: "#64748b", fontSize: 12 }}>
                    {reportsIsFetchingNextPage
                      ? "Loading more…"
                      : reportsHasNextPage
                      ? `Scroll to load more (${filteredReports.length} of ${reportsTotal})`
                      : `All ${reportsTotal} loaded`}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* Attachments modal */}
          {attachmentsModal ? (
            <Modal title={attachmentsModal.title} onClose={() => setAttachmentsModal(null)} width="min(780px, 100%)">
              {attachmentsModal.attachments.length === 0 ? (
                <div style={{ color: "#64748b", fontWeight: 900 }}>No attachments</div>
              ) : (
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
                  {attachmentsModal.attachments.map((a, idx) => (
                    <div
                      key={a.id || `${a.name}_${idx}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "10px 12px",
                        borderTop: idx === 0 ? "none" : "1px solid #f1f5f9",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 950, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.name || "Unnamed file"}
                        </div>
                        <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>
                          {a.size ? `${(a.size / 1024).toFixed(1)} KB` : "—"}
                          {a.type ? ` • ${a.type}` : ""}
                        </div>
                      </div>

                      {a.url ? (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontWeight: 950, color: "#1e3a8a", textDecoration: "none", whiteSpace: "nowrap" }}
                        >
                          Open
                        </a>
                      ) : (
                        <span style={{ color: "#94a3b8", fontWeight: 900 }}>No link</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Modal>
          ) : null}

          {/* Report Context Menu */}
          {ctxReport ? (
            <ContextMenu
              pos={{ x: ctxReport.x, y: ctxReport.y }}
              onClose={() => setCtxReport(null)}
              items={[
                { label: "Edit", icon: <Pencil size={16} />, onClick: () => setEditingReport(ctxReport.item) },
                { label: "Delete", icon: <Trash2 size={16} />, danger: true, onClick: () => setConfirmDeleteReport(ctxReport.item) },
              ]}
            />
          ) : null}

          {/* New Report */}
          {showNewReport ? (
            <Modal
              title="New Inspection Report"
              onClose={() => setShowNewReport(false)}
              headerRight={
                reportDraft ? (
                  <button
                    type="button"
                    onClick={() => {
                      clearReportDraft();
                      setShowNewReport(false);
                    }}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      color: "#b91c1c",
                      fontWeight: 800,
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                    title="Discard draft"
                  >
                    Discard draft
                  </button>
                ) : null
              }
            >
              <InspectionReportForm
                initial={reportDraft || {}}
                saving={createReportMut.isPending}
                onCancel={() => setShowNewReport(false)}
                onSave={(data) => createReportMut.mutate(data)}
                onDraftChange={(data) => setReportDraft(data)}
              />
            </Modal>
          ) : null}

          {/* Edit Report */}
          {editingReport ? (
            <Modal title="Edit Inspection Report" onClose={() => setEditingReport(null)}>
              <InspectionReportForm
                initial={editingReport}
                saving={updateReportMut.isPending}
                onCancel={() => setEditingReport(null)}
                onSave={(data) => updateReportMut.mutate({ id: editingReport.id, input: data })}
              />
            </Modal>
          ) : null}

          {/* Delete confirm report */}
          {confirmDeleteReport ? (
            <Modal title="Confirm Delete" onClose={() => setConfirmDeleteReport(null)} width="min(720px, 100%)">
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ color: "#0f172a", fontWeight: 950 }}>Are you sure you want to delete this report?</div>
                <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>
                  {formatDMY(confirmDeleteReport.date)} • {confirmDeleteReport.vessel || "—"} • {inspectionTypeDisplay(confirmDeleteReport)}
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteReport(null)}
                    style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", background: "white", fontWeight: 900, cursor: "pointer" }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={deleteReportMut.isPending}
                    onClick={() => deleteReportMut.mutate(confirmDeleteReport.id)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid #7f1d1d",
                      background: "#b91c1c",
                      color: "white",
                      fontWeight: 950,
                      cursor: deleteReportMut.isPending ? "not-allowed" : "pointer",
                      opacity: deleteReportMut.isPending ? 0.85 : 1,
                    }}
                  >
                    {deleteReportMut.isPending ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </Modal>
          ) : null}
        </>
      ) : null}

      {/* ===================== STATS TAB ===================== */}
      {mainTab === "stats" ? (
        <div
          id="stats-export-root"
          style={{
            background: "white",
            padding: 0,
            margin: 0,
          }}
        >
          <InspectionStats
            inspections={inspectionsAll}
            reports={reportsAll}
            vessels={vesselsOptions}
            types={inspectionTypesOptions}
            isCompact={isCompact}
          />

        </div>
      ) : null}
    </div>
  );
}
