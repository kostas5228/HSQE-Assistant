import React from "react";
import { useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listDirectoryContacts,
  createDirectoryContact,
  updateDirectoryContact,
  deleteDirectoryContact,
  getSettings,
} from "../api";
import { useDraft } from "../state/drafts";
import { useSessionView } from "../state/sessionView.jsx";

// --------------------
// Small Modal
// --------------------
function Modal({ title, children, onClose, width = "min(920px, 100%)", headerRight = null }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 100,
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          width,
          background: "white",
          borderRadius: 14,
          padding: 16,
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 12, alignItems: "center" }}>
          <div style={{ fontWeight: 950, fontSize: 18 }}>{title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {headerRight}
            <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 18 }}>
              ✕
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

// --------------------
// Context menu (portal) - right click / long press
// --------------------
function ContextMenu({ pos, items, onClose }) {
  React.useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    function onClick() {
      onClose?.();
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

  const w = 190;
  const h = 96;
  const x = Math.min(pos.x, window.innerWidth - w - 8);
  const y = Math.min(pos.y, window.innerHeight - h - 8);

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
              onClose?.();
              it.onClick?.();
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
          {idx !== items.length - 1 ? <div style={{ height: 1, background: "#f1f5f9" }} /> : null}
        </React.Fragment>
      ))}
    </div>,
    document.body
  );
}

// --------------------
// Base44-like MultiSelect dropdown
// Shows only "X selected" like screenshot
// --------------------
function MultiSelectDropdown({
  label,
  placeholder = "Select...",
  options,
  value,
  onChange,
  width = "100%",
  maxMenuHeight = 220,
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    function onDocDown(e) {
      if (!ref.current) return;
      if (ref.current.contains(e.target)) return;
      setOpen(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const selectedCount = Array.isArray(value) ? value.length : 0;

  function toggle(opt) {
    const set = new Set(value || []);
    if (set.has(opt)) set.delete(opt);
    else set.add(opt);
    onChange(Array.from(set));
  }

  function clear() {
    onChange([]);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "relative", width }}>
      {label ? <div style={{ fontSize: 12, fontWeight: 800, color: "#334155", marginBottom: 6 }}>{label}</div> : null}

      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%",
          height: 42,
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          background: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 10px 0 12px",
          cursor: "pointer",
          gap: 10,
        }}
      >
        <span style={{ color: selectedCount ? "#0f172a" : "#64748b", fontWeight: 700, fontSize: 14 }}>
          {selectedCount ? `${selectedCount} selected` : placeholder}
        </span>
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          {selectedCount ? (
            <span
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              title="Clear"
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
              }}
            >
              ×
            </span>
          ) : null}
          <span style={{ opacity: 0.8 }}>▾</span>
        </span>
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            top: 46,
            left: 0,
            width: "100%",
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 14px 40px rgba(2,6,23,0.14)",
            padding: 8,
            zIndex: 50,
          }}
        >
          <div style={{ maxHeight: maxMenuHeight, overflow: "auto", paddingRight: 4 }}>
            {options.map((opt) => {
              const checked = (value || []).includes(opt);
              return (
                <label
                  key={opt}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    padding: "8px 8px",
                    borderRadius: 10,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggle(opt)} />
                  <span style={{ fontWeight: 800 }}>{opt}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// --------------------
// Simple SingleSelect dropdown (department)
// --------------------
function Select({ value, onChange, options, placeholder, width = 260 }) {
  return (
    <div style={{ width }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          height: 42,
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          padding: "0 12px",
          background: "white",
          fontWeight: 800,
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

// --------------------
// Sort select with labels
// --------------------
function SortSelect({ value, onChange, width = 220 }) {
  return (
    <div style={{ width }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          height: 42,
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          padding: "0 12px",
          background: "white",
          fontWeight: 800,
        }}
      >
        <option value="alpha">Alphabetically</option>
        <option value="dept">By Department</option>
        <option value="vessel">By Vessel</option>
      </select>
    </div>
  );
}

// --------------------
// View toggle
// --------------------
function ViewToggle({ value, onChange }) {
  const btn = (active) => ({
    width: 44,
    height: 42,
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: active ? "#0f172a" : "white",
    color: active ? "white" : "#0f172a",
    cursor: "pointer",
    fontWeight: 900,
  });

  return (
    <div style={{ display: "inline-flex", gap: 8 }}>
      <button type="button" onClick={() => onChange("grid")} style={btn(value === "grid")} title="Grid">
        ▦
      </button>
      <button type="button" onClick={() => onChange("list")} style={btn(value === "list")} title="List">
        ≡
      </button>
    </div>
  );
}

// --------------------
// Form (New/Edit) — base44-like (CLEAN REVERT, χωρίς flashId)
// --------------------
function DirectoryForm({
  initial = {},
  onCancel,
  onSave,
  saving,
  departmentsOptions = [],
  vesselsOptions = [],
  onDraftChange,
}) {
  const [form, setForm] = React.useState({
    full_name: initial.full_name || "",
    short_id: initial.short_id || "",
    department: initial.department || "",
    business_phone: initial.business_phone || "",
    personal_phone: initial.personal_phone || "",
    extension: initial.extension || "",
    vessels: Array.isArray(initial.vessels) ? initial.vessels : [],
  });

  function setField(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  // Notify parent so a draft can be persisted across navigation.
  // Skip the very first call so we don't persist an empty/initial draft.
  const draftFirstRef = React.useRef(true);
  React.useEffect(() => {
    if (draftFirstRef.current) {
      draftFirstRef.current = false;
      return;
    }
    onDraftChange?.(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  function submit(e) {
    e.preventDefault();
    onSave?.(form);
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <label style={{ fontWeight: 900 }}>Surname-Name *</label>
        <input
          value={form.full_name}
          onChange={(e) => setField("full_name", e.target.value)}
          required
          style={{
            height: 42,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            padding: "0 12px",
          }}
        />
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 800 }}>Short Identifier</label>
          <input
            value={form.short_id}
            onChange={(e) => setField("short_id", e.target.value)}
            style={{
              height: 42,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              padding: "0 12px",
            }}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 800 }}>Department</label>
          <select
            value={form.department}
            onChange={(e) => setField("department", e.target.value)}
            style={{
              height: 42,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              padding: "0 12px",
              background: "white",
              fontWeight: 800,
            }}
          >
            <option value="">Select department</option>
            {departmentsOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 800 }}>Business Phone</label>
          <input
            value={form.business_phone}
            onChange={(e) => setField("business_phone", e.target.value)}
            style={{
              height: 42,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              padding: "0 12px",
            }}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 800 }}>Personal Phone</label>
          <input
            value={form.personal_phone}
            onChange={(e) => setField("personal_phone", e.target.value)}
            style={{
              height: 42,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              padding: "0 12px",
            }}
          />
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 800 }}>Extension</label>
          <input
            value={form.extension}
            onChange={(e) => setField("extension", e.target.value)}
            style={{
              height: 42,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              padding: "0 12px",
            }}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 800 }}>Assigned Vessel(s)</label>
          <MultiSelectDropdown
            options={vesselsOptions}
            value={form.vessels}
            onChange={(arr) => setField("vessels", arr)}
            placeholder="Assigned Vessel(s)"
            width="100%"
            maxMenuHeight={240}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "white",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #1e3a8a",
            background: "#1e3a8a",
            color: "white",
            fontWeight: 900,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.85 : 1,
          }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

// --------------------
// Main Page (Directory) – START
// --------------------
export default function Directory() {
  const qc = useQueryClient();

  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const departmentsOptions = settingsData?.departments || [];
  const vesselsOptions = settingsData?.vessels || [];

  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("focus");

  // κρατάμε μόνο το highlight-on-focus
  const [flashId, setFlashId] = React.useState(null);
  const rowRefs = React.useRef({});

  React.useEffect(() => {
    if (!focusId) return;

    const id = String(focusId);
    setFlashId(id);

    const el = rowRefs.current[id];
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const t = setTimeout(() => setFlashId(null), 2000);
    return () => clearTimeout(t);
  }, [focusId]);

    // ✅ Session persistence (filters/sort/view) — using your SessionViewContext API
    const { value: session, patch: patchSession, clear: clearSession } = useSessionView("directory", {
      department: "",
      vessels: [],
      sortMode: "alpha",
      view: "list",
      // scrollY: 0, // (αν θες, αλλά το provider σου είναι in-memory μόνο)
    });
    
    const department = session.department || "";
    const vessels = Array.isArray(session.vessels) ? session.vessels : [];
    const sortMode = session.sortMode || "alpha";
    const view = session.view || "list";
    
    const setDepartment = (v) => patchSession({ department: v });
    const setVessels = (arr) => patchSession({ vessels: arr });
    const setSortMode = (v) => patchSession({ sortMode: v });
    const setView = (v) => patchSession({ view: v });



  const [showNew, setShowNew] = React.useState(false);
  const [editing, setEditing] = React.useState(null);

  // context menu
  const [ctx, setCtx] = React.useState(null); // {x,y, contact}

  // Drafts: keep "New Contact" data across navigation.
  const {
    draft: contactDraft,
    setDraft: setContactDraft,
    clearDraft: clearContactDraft,
  } = useDraft("directory-new");
  React.useEffect(() => {
    if (contactDraft) setShowNew(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["directory"],
    queryFn: listDirectoryContacts,
  });

  const createMut = useMutation({
    mutationFn: createDirectoryContact,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["directory"] });
      clearContactDraft();
      setShowNew(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, input }) => updateDirectoryContact(id, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["directory"] });
      setEditing(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteDirectoryContact,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["directory"] });
    },
  });

  function openMenu(pos, contact) {
    setCtx({ x: pos.x, y: pos.y, contact });
  }

  const filtered = React.useMemo(() => {
    let out = contacts.filter((c) => {
      if (department && c.department !== department) return false;

      if (Array.isArray(vessels) && vessels.length) {
        const hasAny = (c.vessels || []).some((v) => vessels.includes(v));
        if (!hasAny) return false;
      }

      return true;
    });

    const byName = (a, b) =>
      String(a.full_name || "").localeCompare(String(b.full_name || ""), "el");

    if (sortMode === "alpha") {
      out.sort(byName);
    } else if (sortMode === "dept") {
      out.sort((a, b) => {
        const d = String(a.department || "").localeCompare(
          String(b.department || ""),
          "el"
        );
        return d !== 0 ? d : byName(a, b);
      });
    } else if (sortMode === "vessel") {
      const vesselKey = (c) => {
        const vs = Array.isArray(c.vessels) ? c.vessels.slice() : [];
        vs.sort((x, y) => String(x).localeCompare(String(y), "el"));
        return String(vs[0] || "");
      };

      out.sort((a, b) => {
        const v = vesselKey(a).localeCompare(vesselKey(b), "el");
        return v !== 0 ? v : byName(a, b);
      });
    }

    return out;
  }, [contacts, department, vessels, sortMode]);

  function clearAll() {
    patchSession({ department: "", vessels: [], sortMode: "alpha", view });
  }

  const containerStyle = {
    width: "100%",
    maxWidth: 1220,
    margin: "0 auto",
  };

  const gridStyle = {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 360px))",
    justifyContent: "start",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1220, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 34, fontWeight: 950 }}>Company Directory</div>
          <div style={{ color: "#64748b", marginTop: 6 }}>Corporate contacts directory</div>
        </div>

        <button
          onClick={() => setShowNew(true)}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #1e3a8a",
            background: "#1e3a8a",
            color: "white",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          + New Contact
        </button>
      </div>

      {/* Filters bar (Base44-like) */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          background: "white",
          padding: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 950 }}>Filters & Sorting</div>
          <button
            type="button"
            onClick={clearAll}
            style={{ border: "none", background: "transparent", fontWeight: 800, cursor: "pointer" }}
          >
            Clear All
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Select
            value={department}
            onChange={(v) => setDepartment(v)}
            options={departmentsOptions}
            placeholder="All Departments"
            width={260}
          />

          <MultiSelectDropdown
            options={vesselsOptions}
            value={vessels}
            onChange={(arr) => setVessels(arr)}
            placeholder="Assigned Vessels"
            width={260}
            maxMenuHeight={240}
          />
          
          <SortSelect value={sortMode} onChange={(v) => setSortMode(v)} width={220} />

          <div style={{ marginLeft: "auto" }}>
            <ViewToggle value={view} onChange={(v) => setView(v)} />
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        {isLoading ? (
          <div style={{ color: "#64748b" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "#64748b" }}>No contacts found.</div>
        ) : view === "list" ? (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", background: "white" }}>
            <div style={{ padding: 12, fontWeight: 900, borderBottom: "1px solid #e5e7eb", background: "#f8fafc" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 2fr 2fr", gap: 10, fontSize: 12, color: "#334155" }}>
                <div>Name</div>
                <div>ID</div>
                <div>Ext.</div>
                <div>Business</div>
                <div>Personal</div>
              </div>
            </div>

            {filtered.map((c) => (
              <div
                key={c.id}
                ref={(node) => {
                  if (node) rowRefs.current[String(c.id)] = node;
                }}
                style={{
                  padding: 12,
                  borderBottom: "1px solid #e5e7eb",
                  background: flashId === String(c.id) ? "#e0f2fe" : "white",
                  cursor: "context-menu",
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openMenu({ x: e.clientX, y: e.clientY }, c);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f8fafc";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = flashId === String(c.id) ? "#e0f2fe" : "white";
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 2fr 2fr", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 900 }}>{c.full_name}</div>
                  <div>{c.short_id || ""}</div>
                  <div>{c.extension || ""}</div>
                  <div>{c.business_phone || ""}</div>
                  <div>{c.personal_phone || ""}</div>
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(c.vessels || []).map((v) => (
                    <span
                      key={v}
                      style={{
                        display: "inline-flex",
                        padding: "4px 10px",
                        borderRadius: 10,
                        background: "#e0ecff",
                        color: "#0b2a6b",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={gridStyle}>
            {filtered.map((c) => (
              <div
                key={c.id}
                ref={(node) => {
                  if (node) rowRefs.current[String(c.id)] = node;
                }}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  background: flashId === String(c.id) ? "#e0f2fe" : "white",
                  padding: 16,
                  boxShadow: "0 1px 0 rgba(2,6,23,0.04)",
                  cursor: "context-menu",
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openMenu({ x: e.clientX, y: e.clientY }, c);
                }}
              >
                <div style={{ fontWeight: 950, fontSize: 18 }}>{c.full_name}</div>
                <div style={{ color: "#64748b", marginTop: 6 }}>{c.short_id || ""}</div>

                <div style={{ height: 1, background: "#e5e7eb", margin: "12px 0" }} />

                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Department</div>
                    <div style={{ fontWeight: 900, color: "#1e3a8a" }}>{c.department || "—"}</div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>Business</div>
                      <div style={{ fontWeight: 900 }}>{c.business_phone || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>Personal</div>
                      <div style={{ fontWeight: 900 }}>{c.personal_phone || "—"}</div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Ext.</div>
                    <div style={{ fontWeight: 900 }}>{c.extension || "—"}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Vessels</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                      {(c.vessels || []).map((v) => (
                        <span
                          key={v}
                          style={{
                            display: "inline-flex",
                            padding: "4px 10px",
                            borderRadius: 10,
                            background: "#e0ecff",
                            color: "#0b2a6b",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context menu */}
      {ctx ? (
        <ContextMenu
          pos={{ x: ctx.x, y: ctx.y }}
          onClose={() => setCtx(null)}
          items={[
            { label: "Edit", icon: <span>✏️</span>, onClick: () => setEditing(ctx.contact) },
            { label: "Delete", icon: <span>🗑</span>, danger: true, onClick: () => deleteMut.mutate(ctx.contact.id) },
          ]}
        />
      ) : null}

      {/* New */}
      {showNew ? (
        <Modal
          title="New Contact"
          onClose={() => setShowNew(false)}
          width="min(860px, 100%)"
          headerRight={
            contactDraft ? (
              <button
                type="button"
                onClick={() => {
                  clearContactDraft();
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
          <DirectoryForm
            initial={contactDraft || {}}
            saving={createMut.isPending}
            onCancel={() => setShowNew(false)}
            onSave={(data) => createMut.mutate(data)}
            onDraftChange={(data) => setContactDraft(data)}
            departmentsOptions={departmentsOptions}
            vesselsOptions={vesselsOptions}
          />
        </Modal>
      ) : null}

      {/* Edit */}
      {editing ? (
        <Modal title="Edit Contact" onClose={() => setEditing(null)} width="min(860px, 100%)">
          <DirectoryForm
            initial={editing}
            saving={updateMut.isPending}
            onCancel={() => setEditing(null)}
            onSave={(data) => updateMut.mutate({ id: editing.id, input: data })}
            departmentsOptions={departmentsOptions}
            vesselsOptions={vesselsOptions}
          />
        </Modal>
      ) : null}
    </div>
  );
}
