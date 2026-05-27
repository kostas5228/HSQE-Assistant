// src/pages/Dashboard.jsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import {
  ChevronDown,
  Calendar as CalendarIcon,
  AlertTriangle,
  Clock,
  Sun,
  FileText,
  ClipboardList,
  Siren,
  LayoutList,
  StickyNote,
  Plus,
  Pin,
  X,
  Palette,
  GripVertical,
} from "lucide-react";

import {
  getMe,
  listCertificates,
  listTasks,
  listInspections,
  listInspectionReports,
} from "../api";
import { mockVessels } from "../mock/data";

import DashboardCalendar from "../components/DashboardCalendar";

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// --------------------
// Small helpers
// --------------------
function safeDate(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDMY(v) {
  const d = safeDate(v);
  if (!d) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysDiff(from, to) {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function isWithinNextDays(date, n) {
  const d = safeDate(date);
  if (!d) return false;
  const now = new Date();
  const dd = daysDiff(now, d);
  return dd >= 0 && dd <= n;
}

function isOverdueDate(date) {
  const d = safeDate(date);
  if (!d) return false;
  const now = new Date();
  return startOfDay(d).getTime() < startOfDay(now).getTime();
}

// Inspections: support multiple possible date fields (so you don't need "data shape")
function pickInspectionDate(i) {
  return (
    safeDate(i?.date) ||
    safeDate(i?.inspection_date) ||
    safeDate(i?.scheduled_date) ||
    safeDate(i?.due_date) ||
    safeDate(i?.eta) ||
    null
  );
}

// ✅ robust truthy for "detention"
function isTruthy(v) {
  if (v === true) return true;
  if (v === false || v === null || v === undefined) return false;

  if (typeof v === "number") return v !== 0;

  const s = String(v).trim().toLowerCase();
  if (!s) return false;

  return ["true", "yes", "y", "1", "detention", "detained", "✓", "tick"].includes(s);
}

// ✅ read detention from common alternative keys too
function readDetentionFlag(r) {
  return (
    r?.detention ??
    r?.is_detention ??
    r?.detained ??
    r?.detention_flag ??
    r?.detention_status ??
    r?.isDetention ??
    r?.isDetained
  );
}

function fromLocalDatetimeValue(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function uid() {
  return `n${Math.floor(Math.random() * 1_000_000_000)}`;
}

// --------------------
// Notes storage (local) — same key as Tasks.jsx + DashboardCalendar.jsx
// --------------------
const NOTES_KEY = "hsqe_notes_v1";

function loadNotes() {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveNotes(list) {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(Array.isArray(list) ? list : []));
  } catch {
    // ignore
  }
}

// --------------------
// UI atoms
// --------------------
function Card({ title, icon: Icon, right, children, minHeight }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 16,
        background: "white",
        minHeight: minHeight || "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {Icon ? <Icon size={18} /> : null}
          <div
            style={{
              fontWeight: 950,
              color: "#0f172a",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
        </div>
        {right ? <div style={{ flex: "0 0 auto" }}>{right}</div> : null}
      </div>
      {children}
    </div>
  );
}

function ScrollBox({ children, maxHeight = 340 }) {
  return (
    <div style={{ maxHeight, overflowY: "auto", paddingRight: 4 }}>
      {children}
    </div>
  );
}

function ItemRow({ title, subtitle, right, onClick }) {
  const [hover, setHover] = React.useState(false);
  const clickable = typeof onClick === "function";

  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        textAlign: "left",
        border: "none",
        background: "transparent",
        padding: 0,
        cursor: clickable ? "pointer" : "default",
      }}
      title={clickable ? "Open" : undefined}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 0",
          borderBottom: "1px solid #f1f5f9",
          alignItems: "flex-start",
          borderRadius: 10,
          background: clickable && hover ? "rgba(15,23,42,0.04)" : "transparent",
          transition: "background 120ms ease",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 900,
              color: "#0f172a",
              textDecoration: clickable && hover ? "underline" : "none",
              textUnderlineOffset: 3,
              overflowWrap: "anywhere",
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div style={{ fontSize: 12, color: "#475569", marginTop: 2, overflowWrap: "anywhere" }}>
              {subtitle}
            </div>
          ) : null}
        </div>

        {right ? (
          <div style={{ fontSize: 12, color: "#0f172a", whiteSpace: "nowrap", fontWeight: 900 }}>{right}</div>
        ) : null}
      </div>
    </button>
  );
}

function RowSection({ id, title, subtitle, defaultOpen = true, children }) {
  const key = "dashboard_rows_v1";
  const [open, setOpen] = React.useState(defaultOpen);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (obj && typeof obj[id] === "boolean") setOpen(obj[id]);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      const obj = raw ? JSON.parse(raw) : {};
      obj[id] = open;
      localStorage.setItem(key, JSON.stringify(obj));
    } catch {
      // ignore
    }
  }, [id, open]);

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "white", overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%",
          border: "none",
          background: "#ffffff",
          cursor: "pointer",
          padding: "12px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
        title={open ? "Collapse row" : "Expand row"}
      >
        <div style={{ textAlign: "left", minWidth: 0 }}>
          <div style={{ fontWeight: 980, color: "#0f172a" }}>{title}</div>
          {subtitle ? (
            <div style={{ color: "#64748b", fontWeight: 800, fontSize: 12, marginTop: 2 }}>{subtitle}</div>
          ) : null}
        </div>

        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            display: "grid",
            placeItems: "center",
            background: "#f8fafc",
            flex: "0 0 auto",
          }}
        >
          <ChevronDown
            size={18}
            style={{
              transform: open ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 140ms ease",
            }}
          />
        </div>
      </button>

      {open ? <div style={{ padding: 14, background: "#f8fafc" }}>{children}</div> : null}
    </div>
  );
}

// --------------------
// Modal (for "+ Note" popup)
// --------------------
function Modal({ title, children, onClose, width = "min(720px, 100%)" }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,23,0.55)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 200,
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          width,
          background: "white",
          borderRadius: 16,
          maxHeight: "90vh",
          overflow: "hidden",
          boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
          display: "flex",
          flexDirection: "column",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            background: "white",
            borderBottom: "1px solid #e5e7eb",
            padding: "14px 16px",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 18, color: "#0f172a" }}>{title}</div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "white",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 16, overflow: "auto" }}>{children}</div>
      </div>
    </div>
  );
}

const NOTE_COLORS = [
  { id: "slate", label: "Slate" },
  { id: "amber", label: "Amber" },
  { id: "green", label: "Green" },
  { id: "blue", label: "Blue" },
  { id: "rose", label: "Rose" },
];

function NoteCreateForm({ vessels, onCancel, onSave }) {
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [vessel, setVessel] = React.useState("");
  const [pinned, setPinned] = React.useState(true);
  const [reminderLocal, setReminderLocal] = React.useState("");
  const [color, setColor] = React.useState("amber");

  function submit(e) {
    e.preventDefault();
    const t = title.trim();
    const b = body.trim();
    if (!t && !b) return;

    onSave?.({
      title: t || "Note",
      body: b,
      vessel: vessel || "",
      pinned: !!pinned,
      reminder_at: reminderLocal ? fromLocalDatetimeValue(reminderLocal) : "",
      color,
    });
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 950, color: "#0f172a" }}>Title</div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          style={{
            height: 42,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            padding: "0 12px",
            outline: "none",
            fontWeight: 800,
            background: "white",
            color: "#0f172a",
          }}
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 950, color: "#0f172a" }}>Notes</div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your note..."
          rows={6}
          style={{
            width: "100%",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            padding: 12,
            fontWeight: 800,
            outline: "none",
            resize: "vertical",
            color: "#0f172a",
            background: "white",
            lineHeight: 1.35,
          }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 950, color: "#0f172a" }}>Vessel</div>
          <select
            value={vessel}
            onChange={(e) => setVessel(e.target.value)}
            style={{
              height: 42,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: "0 12px",
              background: "white",
              fontWeight: 900,
              cursor: "pointer",
              color: "#0f172a",
            }}
          >
            <option value="">—</option>
            {(vessels || []).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 950, color: "#0f172a" }}>Reminder</div>
          <input
            type="datetime-local"
            value={reminderLocal}
            onChange={(e) => setReminderLocal(e.target.value)}
            style={{
              height: 42,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: "0 12px",
              fontWeight: 900,
              color: "#0f172a",
              background: "white",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 950, color: "#0f172a" }}>
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Pin size={16} /> Pin
          </span>
        </label>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 950, color: "#0f172a", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Palette size={16} /> Color
          </div>
          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{
              height: 42,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: "0 12px",
              background: "white",
              fontWeight: 900,
              cursor: "pointer",
              color: "#0f172a",
            }}
          >
            {NOTE_COLORS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            height: 40,
            padding: "0 14px",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "white",
            fontWeight: 950,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>

        <button
          type="submit"
          style={{
            height: 40,
            padding: "0 14px",
            borderRadius: 12,
            border: "1px solid #1e3a8a",
            background: "#1e3a8a",
            color: "white",
            fontWeight: 950,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <StickyNote size={18} />
          Save
        </button>
      </div>
    </form>
  );
}

// --------------------
// DnD helpers (Dashboard lists)
// --------------------
function getDateMs(v) {
  const d = safeDate(v);
  return d ? d.getTime() : Number.POSITIVE_INFINITY;
}

// Default chronological (closest first)
function sortByDateAsc(items) {
  const out = [...(items || [])];
  out.sort((a, b) => getDateMs(a?.date) - getDateMs(b?.date));
  return out;
}

function sortByDateDesc(items) {
  const out = [...(items || [])];
  out.sort((a, b) => getDateMs(b?.date) - getDateMs(a?.date));
  return out;
}

// Apply a remembered order (ids array) onto a freshly computed list.
// - Keeps items that still exist
// - Appends any new items at the end (still stable)
function applyOrder(items, orderIds) {
  if (!Array.isArray(items)) return [];
  if (!Array.isArray(orderIds) || orderIds.length === 0) return items;

  const byId = new Map(items.map((it) => [String(it?.key ?? ""), it]).filter(([k]) => k));
  const used = new Set();

  const ordered = [];
  for (const id of orderIds) {
    const it = byId.get(String(id));
    if (it && !used.has(String(id))) {
      ordered.push(it);
      used.add(String(id));
    }
  }

  // Append remaining items (new/unordered)
  for (const it of items) {
    const id = String(it.key);
    if (!id) continue;
    if (!used.has(id)) ordered.push(it);
  }

  return ordered;
}

// One sortable row (we add a small "grip" handle)
function SortableRow({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1,
    borderRadius: 10,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.preventDefault()}
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "white",
            cursor: "grab",
            display: "grid",
            placeItems: "center",
            flex: "0 0 auto",
            marginTop: 6,
          }}
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Generic sortable list wrapper
function SortableList({ items, onOrderChange, renderItem }) {
  // Mobile long-press + desktop drag:
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 180,      // long-press on mobile
        tolerance: 6,
        distance: 8,     // prevents accidental drags on desktop
      },
    })
  );

  function handleDragEnd(e) {
    const { active, over } = e;
    if (!over) return;
    if (String(active.id) === String(over.id)) return;

    const oldIndex = items.findIndex((x) => String(x.key) === String(active.id));
    const newIndex = items.findIndex((x) => String(x.key) === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(items, oldIndex, newIndex);
    onOrderChange(next.map((x) => String(x.key)));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((x) => String(x.key))} strategy={verticalListSortingStrategy}>
        <div style={{ display: "grid", gap: 2 }}>
          {items.map((it) => renderItem(it))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// --------------------
// Dashboard list prefs (localStorage)
// --------------------
const DASH_LISTS_KEY = "hsqe_dashboard_lists_v1";

const LIST_MYDAY = "myday";
const LIST_DUE7 = "due7";
const LIST_OVERDUE = "overdue";
const LIST_UPCOMING30 = "upcoming30";

function loadDashboardListsPrefs() {
  try {
    const raw = localStorage.getItem(DASH_LISTS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function saveDashboardListsPrefs(obj) {
  try {
    localStorage.setItem(DASH_LISTS_KEY, JSON.stringify(obj && typeof obj === "object" ? obj : {}));
  } catch {
    // ignore
  }
}

function getListPrefs(all, listId) {
  const x = all?.[listId];
  if (!x || typeof x !== "object") return {};
  return x;
}

function setListPrefs(all, listId, patch) {
  const base = (all && typeof all === "object") ? all : {};
  const prev = (base[listId] && typeof base[listId] === "object") ? base[listId] : {};
  return {
    ...base,
    [listId]: { ...prev, ...(patch && typeof patch === "object" ? patch : {}) },
  };
}

// --------------------
// Page
// --------------------
export default function Dashboard() {
  const navigate = useNavigate();

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: getMe });

  const { data: certificates = [] } = useQuery({ queryKey: ["certificates"], queryFn: listCertificates });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: listTasks });
  const { data: inspections = [] } = useQuery({ queryKey: ["inspections"], queryFn: listInspections });
  const { data: reports = [] } = useQuery({ queryKey: ["inspection_reports"], queryFn: listInspectionReports });

  const vesselOptions = Array.isArray(mockVessels)
    ? mockVessels.map((v) => (typeof v === "string" ? v : v?.name)).filter(Boolean)
    : [];

  // ✅ Routes
  const ROUTES = {
    certificates: "/certificates",
    tasks: "/tasks",
    inspections: "/inspections",
  };

  function goTo(type, rawId) {
    if (rawId === null || rawId === undefined || rawId === "") return;

    const qs = `focus=${encodeURIComponent(String(rawId))}&from=dashboard`;

    if (type === "certificate") navigate(`${ROUTES.certificates}?${qs}`);
    else if (type === "task") navigate(`${ROUTES.tasks}?${qs}`);
    else if (type === "note") navigate(`${ROUTES.tasks}?section=notes&${qs}`);
    else if (type === "inspection") navigate(`${ROUTES.inspections}?tab=list&${qs}`);
    else if (type === "inspection_report") navigate(`${ROUTES.inspections}?tab=reports&${qs}`);
  }

  const today = startOfDay(new Date());

  const myDayCertificates = React.useMemo(() => {
    return certificates.filter((c) => {
      const d = safeDate(c.to_date);
      if (!d) return false;
      return startOfDay(d).getTime() === today.getTime();
    });
  }, [certificates, today]);

  const myDayTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      if (t.status === "Completed") return false;
      if (t?.kind === "note") return false;

      if (t.add_to_my_day) return true;
      const d = safeDate(t.due_date);
      if (!d) return false;
      return startOfDay(d).getTime() === today.getTime();
    });
  }, [tasks, today]);

    // --------------------
  // ✅ My Day combined list (certificates first, then tasks) + DnD keys
  // --------------------
  const myDayItems = React.useMemo(() => {
    const items = [];

    // Certificates first (default order)
    for (const c of myDayCertificates) {
      items.push({
        key: `myday_certificate_${c.id}`,
        type: "certificate",
        rawId: c.id,
        title: c.certificate_name || c.certificate_code || "Certificate",
        date: c.to_date,
        subtitle: c.vessel ? `Vessel: ${c.vessel}` : "",
      });
    }

    // Tasks second (default order)
    for (const t of myDayTasks) {
      items.push({
        key: `myday_task_${t.id}`,
        type: "task",
        rawId: t.id,
        title: t.title || "Task",
        date: t.due_date,
        subtitle: Array.isArray(t.vessels) && t.vessels.length ? t.vessels.join(", ") : "",
      });
    }

    return items;
  }, [myDayCertificates, myDayTasks]);


  // --------------------
  // NOTES for Dashboard (localStorage)
  // --------------------
  const [notesTick, setNotesTick] = React.useState(0);

  React.useEffect(() => {
    const bump = () => setNotesTick((x) => x + 1);
  
    // 1) If localStorage changes from another tab
    const onStorage = (e) => {
      if (e.key === NOTES_KEY) bump();
    };
  
    // 2) Custom event (when saving/deleting note in the same tab)
    const onNotesChanged = () => bump();
  
    // 3) When the user returns to the tab (visibility/focus)
    const onFocus = () => bump();
    const onVisibility = () => {
      if (document.visibilityState === "visible") bump();
    };
  
    window.addEventListener("storage", onStorage);
    window.addEventListener("hsqe_notes_changed", onNotesChanged);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
  
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("hsqe_notes_changed", onNotesChanged);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  
  const notes = React.useMemo(() => loadNotes(), [notesTick]);


  // ✅ Notes: pinned sorted by created_at (newest first)
  const notesPinned = React.useMemo(() => {
    const list = notes.filter((n) => !!n?.pinned);
    list.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    return list; // keep all, trim in UI
  }, [notes]);

  // ✅ Note reminders (7 days): sorted by reminder soonest
  const notesUpcomingReminders = React.useMemo(() => {
    const list = notes.filter((n) => !!n?.reminder_at && isWithinNextDays(n.reminder_at, 7));
    list.sort((a, b) => String(a.reminder_at || "").localeCompare(String(b.reminder_at || "")));
    return list; // keep all, trim in UI
  }, [notes]);

  // "+ Note" popup state
  const [showNewNote, setShowNewNote] = React.useState(false);

  // ✅ Detentions toggle (new→old / old→new)
  const [detentionsNewestFirst, setDetentionsNewestFirst] = React.useState(true);
  // ✅ Sort toggles (New → Old / Old → New)
  const [dueNewestFirst, setDueNewestFirst] = React.useState(false);       // due default: soonest first (old→new)
  const [overdueNewestFirst, setOverdueNewestFirst] = React.useState(true); // overdue default: newest first
  const [upcomingNewestFirst, setUpcomingNewestFirst] = React.useState(false); // upcoming default: soonest first
    // --------------------
  // Mode per list: "manual" (drag) or "date" (sort by date)
  // --------------------
  const [myDayMode, setMyDayMode] = React.useState("manual");
  const [due7Mode, setDue7Mode] = React.useState("date");       // due default is date-based
  const [overdueMode, setOverdueMode] = React.useState("date"); // overdue default date-based
  const [upcoming30Mode, setUpcoming30Mode] = React.useState("date"); // upcoming default date-based

  const [recentReportsNewestFirst, setRecentReportsNewestFirst] = React.useState(true); // default newest first
  const [recentFindingsNewestFirst, setRecentFindingsNewestFirst] = React.useState(true); // default newest first


  // --------------------
  // Reorder persistence
  // --------------------
  const [due7Order, setDue7Order] = React.useState([]);
  const [overdueOrder, setOverdueOrder] = React.useState([]);
  const [upcoming30Order, setUpcoming30Order] = React.useState([]);
  const [myDayOrder, setMyDayOrder] = React.useState([]);
    // --------------------
    // Load persisted list prefs on mount
    // --------------------
    React.useEffect(() => {
      const all = loadDashboardListsPrefs();
    
      // My Day
      const pMy = getListPrefs(all, LIST_MYDAY);
      if (Array.isArray(pMy.order)) setMyDayOrder(pMy.order);
      if (pMy.mode === "manual" || pMy.mode === "date") setMyDayMode(pMy.mode);
    
      // Due 7
      const pD7 = getListPrefs(all, LIST_DUE7);
      if (Array.isArray(pD7.order)) setDue7Order(pD7.order);
      if (typeof pD7.newestFirst === "boolean") setDueNewestFirst(pD7.newestFirst);
      if (pD7.mode === "manual" || pD7.mode === "date") setDue7Mode(pD7.mode);
    
      // Overdue
      const pOd = getListPrefs(all, LIST_OVERDUE);
      if (Array.isArray(pOd.order)) setOverdueOrder(pOd.order);
      if (typeof pOd.newestFirst === "boolean") setOverdueNewestFirst(pOd.newestFirst);
      if (pOd.mode === "manual" || pOd.mode === "date") setOverdueMode(pOd.mode);
    
      // Upcoming 30
      const pUp = getListPrefs(all, LIST_UPCOMING30);
      if (Array.isArray(pUp.order)) setUpcoming30Order(pUp.order);
      if (typeof pUp.newestFirst === "boolean") setUpcomingNewestFirst(pUp.newestFirst);
      if (pUp.mode === "manual" || pUp.mode === "date") setUpcoming30Mode(pUp.mode);
    }, []);

  function createDashboardNote(data) {
    const nowIso = new Date().toISOString();
    const n = {
      id: uid(),
      title: data.title || "Note",
      body: data.body || "",
      vessel: data.vessel || "",
      pinned: !!data.pinned,
      reminder_at: data.reminder_at || "",
      color: data.color || "amber",
      created_at: nowIso,
      updated_at: nowIso,
    };

    const existing = loadNotes();
    saveNotes([n, ...existing]);

    // 🔔 notify ALL listeners (Dashboard/Tasks/Calendar)
    window.dispatchEvent(new Event("hsqe_notes_changed"));
    
    setShowNewNote(false);
  }

    // --------------------
    // Persist helpers (save mode/order/sort)
    // --------------------
    function persistPatch(listId, patch) {
      const all = loadDashboardListsPrefs();
      const next = setListPrefs(all, listId, patch);
      saveDashboardListsPrefs(next);
    }
  
    function onMyDayDragOrder(ids) {
      setMyDayMode("manual");
      setMyDayOrder(ids);
      persistPatch(LIST_MYDAY, { mode: "manual", order: ids });
    }
  
    function onDue7DragOrder(ids) {
      setDue7Mode("manual");
      setDue7Order(ids);
      persistPatch(LIST_DUE7, { mode: "manual", order: ids });
    }
  
    function onOverdueDragOrder(ids) {
      setOverdueMode("manual");
      setOverdueOrder(ids);
      persistPatch(LIST_OVERDUE, { mode: "manual", order: ids });
    }
  
    function onUpcoming30DragOrder(ids) {
      setUpcoming30Mode("manual");
      setUpcoming30Order(ids);
      persistPatch(LIST_UPCOMING30, { mode: "manual", order: ids });
    }


  // ✅ Due in 7 days: certificates + tasks + inspections
  const due7 = React.useMemo(() => {
    const items = [];

    for (const c of certificates) {
      if (!c.to_date) continue;
      if (!isWithinNextDays(c.to_date, 7)) continue;
      if (isOverdueDate(c.to_date)) continue;

      items.push({
        key: `certificate_${c.id}`,
        type: "certificate",
        rawId: c.id,
        title: c.certificate_name || c.certificate_code || "Certificate",
        date: c.to_date,
        subtitle: c.vessel ? `${c.vessel} • ${c.certificate_code || ""}`.trim() : c.certificate_code || "",
      });
    }

    for (const t of tasks) {
      if (t?.kind === "note") continue;
      if (t.status === "Completed") continue;
      if (!t.due_date) continue;
      if (!isWithinNextDays(t.due_date, 7)) continue;
      if (isOverdueDate(t.due_date)) continue;

      items.push({
        key: `task_${t.id}`,
        type: "task",
        rawId: t.id,
        title: t.title || "Task",
        date: t.due_date,
        subtitle: Array.isArray(t.vessels) && t.vessels.length ? t.vessels.join(", ") : "",
      });
    }

    
    return items; // keep all, trim in UI
  }, [certificates, tasks]);

  // ✅ Overdue: certificates + tasks + inspections
  const overdue = React.useMemo(() => {
    const items = [];

    for (const c of certificates) {
      if (!c.to_date) continue;
      if (!isOverdueDate(c.to_date)) continue;

      items.push({
        key: `certificate_${c.id}`,
        type: "certificate",
        rawId: c.id,
        title: c.certificate_name || c.certificate_code || "Certificate",
        date: c.to_date,
        subtitle: c.vessel ? `${c.vessel} • ${c.certificate_code || ""}`.trim() : c.certificate_code || "",
      });
    }

    for (const t of tasks) {
      if (t?.kind === "note") continue;
      if (t.status === "Completed") continue;
      if (!t.due_date) continue;
      if (!isOverdueDate(t.due_date)) continue;

      items.push({
        key: `task_${t.id}`,
        type: "task",
        rawId: t.id,
        title: t.title || "Task",
        date: t.due_date,
        subtitle: Array.isArray(t.vessels) && t.vessels.length ? t.vessels.join(", ") : "",
      });
    }

    
    return items; // keep all, trim in UI
  }, [certificates, tasks]);

  // ✅ Upcoming 30 days: certificates + tasks + inspections
  const upcoming30 = React.useMemo(() => {
    const items = [];

    for (const c of certificates) {
      if (!c.to_date) continue;
      if (!isWithinNextDays(c.to_date, 30)) continue;
      if (isOverdueDate(c.to_date)) continue;

      items.push({
        key: `certificate_${c.id}`,
        type: "certificate",
        rawId: c.id,
        title: c.certificate_name || c.certificate_code || "Certificate",
        date: c.to_date,
        subtitle: c.vessel ? `${c.vessel} • ${c.certificate_code || ""}`.trim() : c.certificate_code || "",
      });
    }

    for (const t of tasks) {
      if (t?.kind === "note") continue;
      if (t.status === "Completed") continue;
      if (!t.due_date) continue;
      if (!isWithinNextDays(t.due_date, 30)) continue;
      if (isOverdueDate(t.due_date)) continue;

      items.push({
        key: `task_${t.id}`,
        type: "task",
        rawId: t.id,
        title: t.title || "Task",
        date: t.due_date,
        subtitle: Array.isArray(t.vessels) && t.vessels.length ? t.vessels.join(", ") : "",
      });
    }

        
    return items; // keep all, trim in UI
  }, [certificates, tasks]);
  
  // --------------------
  // ✅ Step 5: "display lists" = default sort by date + apply drag order
  // Put this block RIGHT AFTER the upcoming30 useMemo (immediately below it)
  // --------------------

  const due7Sorted = React.useMemo(
    () => (dueNewestFirst ? sortByDateDesc(due7) : sortByDateAsc(due7)),
    [due7, dueNewestFirst]
  );

  const overdueSorted = React.useMemo(
    () => (overdueNewestFirst ? sortByDateDesc(overdue) : sortByDateAsc(overdue)),
    [overdue, overdueNewestFirst]
  );

  const upcoming30Sorted = React.useMemo(
    () => (upcomingNewestFirst ? sortByDateDesc(upcoming30) : sortByDateAsc(upcoming30)),
    [upcoming30, upcomingNewestFirst]
  );

  const due7Display = React.useMemo(() => {
    if (due7Mode === "date") return due7Sorted;
    return applyOrder(due7Sorted, due7Order);
  }, [due7Sorted, due7Order, due7Mode]);

  const overdueDisplay = React.useMemo(() => {
    if (overdueMode === "date") return overdueSorted;
    return applyOrder(overdueSorted, overdueOrder);
  }, [overdueSorted, overdueOrder, overdueMode]);

  const upcoming30Display = React.useMemo(() => {
    if (upcoming30Mode === "date") return upcoming30Sorted;
    return applyOrder(upcoming30Sorted, upcoming30Order);
  }, [upcoming30Sorted, upcoming30Order, upcoming30Mode]);

  const myDayDisplay = React.useMemo(() => {
    if (myDayMode === "date") return sortByDateAsc(myDayItems); // MyDay if you ever set it to date mode
    return applyOrder(myDayItems, myDayOrder);
  }, [myDayItems, myDayOrder, myDayMode]);


  // ✅ Detentions YTD
    // ✅ Detentions (all years) with toggle
  const detentionsAll = React.useMemo(() => {
  const list = reports.filter((r) => {
    const detentionVal = readDetentionFlag(r);
    if (!isTruthy(detentionVal)) return false;

    const d = safeDate(r.date);
    if (!d) return false;

    return true;
  });

  list.sort((a, b) => {
    const A = String(a.date || "");
    const B = String(b.date || "");
    return detentionsNewestFirst ? B.localeCompare(A) : A.localeCompare(B);
  });

  return list;
}, [reports, detentionsNewestFirst]);

  const recentReports = React.useMemo(() => {
  const out = [...reports];
  out.sort((a, b) => {
    const A = String(a.date || "");
    const B = String(b.date || "");
    return recentReportsNewestFirst ? B.localeCompare(A) : A.localeCompare(B);
  });
  return out; // trim in UI
}, [reports, recentReportsNewestFirst]);

  const recentFindings = React.useMemo(() => {
  const out = [...inspections];
  out.sort((a, b) => {
    const A = String(pickInspectionDate(a) || a.date || "");
    const B = String(pickInspectionDate(b) || b.date || "");
    return recentFindingsNewestFirst ? B.localeCompare(A) : A.localeCompare(B);
  });
  return out; // trim in UI
}, [inspections, recentFindingsNewestFirst]);

  // Responsive media query hook
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
    if (m.addEventListener) {
      m.addEventListener("change", onChange);
    } else {
      m.addListener(onChange);
    }
    return () => {
      if (m.removeEventListener) {
        m.removeEventListener("change", onChange);
      } else {
        m.removeListener(onChange);
      }
    };
  }, [query]);

  return matches;
}

  const isSmallScreen = useMediaQuery("(max-width: 700px)");

  const agendaRight = (
    <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <button
        type="button"
        onClick={() => setShowNewNote(true)}
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          border: "1px solid #1e3a8a",
          background: "#1e3a8a",
          color: "white",
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          lineHeight: 1,
        }}
        title="New Note"
      >
        <Plus size={18} />
      </button>

      <button
        type="button"
        onClick={() => navigate("/tasks?section=notes")}
        style={{
          height: 34,
          padding: "0 10px",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          background: "white",
          cursor: "pointer",
          fontWeight: 900,
          color: "#0f172a",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
        title="Open Notes"
      >
        <StickyNote size={16} />
        Open
      </button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 980, margin: 0, color: "#0f172a" }}>Dashboard</h1>
      </div>

      <RowSection
        id="row_calendar"
        title="Calendar"
        defaultOpen={true}
      >
        <Card title="Calendar" icon={CalendarIcon}>
          {/* Notes reminders come from localStorage via DashboardCalendar */}
          <DashboardCalendar certificates={certificates} tasks={tasks} user={user} />
        </Card>
      </RowSection>

      {/* Agenda & My Day block */}
      <RowSection
        id="row_agenda_myday"
        title="Agenda & My Day"
        defaultOpen={true}
      >
        <div style={{ display: "grid", gridTemplateColumns: isSmallScreen ? "1fr" : "1.2fr 1fr", gap: 14 }}>
          <Card title="Agenda (Notes)" icon={LayoutList} right={agendaRight}>
            {/* Pinned Notes */}
            <div style={{ marginTop: 2 }}>
              <div style={{ fontWeight: 950, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                <Pin size={16} />
                Pinned
              </div>
              {notesPinned.length === 0 ? (
                <div style={{ color: "#64748b", fontWeight: 900, marginTop: 8 }}>No pinned notes.</div>
              ) : (
                <div style={{ marginTop: 6 }}>
                  <ScrollBox maxHeight={420}>
                    {notesPinned.map((n) => (
                      <ItemRow
                        key={`pin-${n.id}`}
                        title={`📝 ${n.title || "Note"}`}
                        subtitle={(n.vessel ? n.vessel : "") + (n.reminder_at ? ` • Reminder ${formatDMY(n.reminder_at)}` : "")}
                        right={n.reminder_at ? formatDMY(n.reminder_at) : ""}
                        onClick={() => goTo("note", n.id)}
                      />
                    ))}
                  </ScrollBox>
                </div>
              )}
            </div>

            {/* Upcoming note reminders */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 950, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={16} />
                Note Reminders (7 days)
              </div>
              {notesUpcomingReminders.length === 0 ? (
                <div style={{ color: "#64748b", fontWeight: 900, marginTop: 8 }}>No upcoming note reminders.</div>
              ) : (
                <div style={{ marginTop: 6 }}>
                  <ScrollBox maxHeight={420}>
                    {notesUpcomingReminders.map((n) => (
                      <ItemRow
                        key={`rem-${n.id}`}
                        title={`⏰ ${n.title || "Note"}`}
                        subtitle={n.vessel ? n.vessel : ""}
                        right={formatDMY(n.reminder_at)}
                        onClick={() => goTo("note", n.id)}
                      />
                    ))}
                  </ScrollBox>
                </div>
              )}
            </div>
          </Card>

          <Card title={`My Day • ${formatDMY(new Date())}`} icon={Sun}>
            {myDayCertificates.length === 0 && myDayTasks.length === 0 ? (
              <div style={{ color: "#64748b", fontWeight: 900 }}>No items for today.</div>
            ) : (
              <ScrollBox maxHeight={420}>
                <SortableList
                  items={myDayDisplay}
                  onOrderChange={onMyDayDragOrder}
                  renderItem={(x) => (
                    <SortableRow key={x.key} id={String(x.key)}>
                      <ItemRow
                        title={x.type === "certificate" ? `📜 ${x.title}` : `✓ ${x.title}`}
                        subtitle={x.subtitle}
                        right={formatDMY(x.date)}
                        onClick={() => goTo(x.type, x.rawId)}
                      />
                    </SortableRow>
                  )}
                />
              </ScrollBox>
            )}
          </Card>
        </div>
      </RowSection>

      <RowSection id="row_due_overdue" title="Due & Overdue" defaultOpen={true}>
        <div style={{ display: "grid", gridTemplateColumns: isSmallScreen ? "1fr" : "1fr 1fr", gap: 14 }}>
          <Card
            title="Due in 7 days"
            icon={Clock}
            right={
              <button
                type="button"
                onClick={() => {
                  setDue7Mode("date");
                  setDueNewestFirst((p) => {
                    const next = !p;
                    persistPatch(LIST_DUE7, { mode: "date", newestFirst: next });
                    return next;
                  });
                }}
                style={{
                  height: 28,
                  padding: "0 10px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 900,
                  color: "#0f172a",
                }}
                title={dueNewestFirst ? "Sort: New → Old" : "Sort: Old → New"}
              >
                {dueNewestFirst ? "↓ New" : "↑ Old"}
              </button>
            }
          >
            {due7Display.length === 0 ? (
              <div style={{ color: "#64748b", fontWeight: 900 }}>No items due in the next 7 days.</div>
            ) : (
              <ScrollBox maxHeight={340}>
                <SortableList
                  items={due7Display}
                  onOrderChange={onDue7DragOrder}
                  renderItem={(x) => (
                    <SortableRow key={x.key} id={String(x.key)}>
                      <ItemRow
                        title={x.type === "certificate" ? `📜 ${x.title}` : x.type === "task" ? `✓ ${x.title}` : `🧾 ${x.title}`}
                        subtitle={x.subtitle}
                        right={formatDMY(x.date)}
                        onClick={() => goTo(x.type, x.rawId)}
                      />
                    </SortableRow>
                  )}
                />
              </ScrollBox>
            )}
          </Card>

          <Card
            title="Overdue"
            icon={AlertTriangle}
            right={
              <button
                type="button"
                onClick={() => {
                  setOverdueMode("date");
                  setOverdueNewestFirst((p) => {
                    const next = !p;
                    persistPatch(LIST_OVERDUE, { mode: "date", newestFirst: next });
                    return next;
                  });
                }}
                style={{
                  height: 28,
                  padding: "0 10px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 900,
                  color: "#0f172a",
                }}
                title={overdueNewestFirst ? "Sort: New → Old" : "Sort: Old → New"}
              >
                {overdueNewestFirst ? "↓ New" : "↑ Old"}
              </button>
            }
          >
            {overdueDisplay.length === 0 ? (
              <div style={{ color: "#64748b", fontWeight: 900 }}>No overdue items.</div>
            ) : (
              <ScrollBox maxHeight={340}>
                <SortableList
                  items={overdueDisplay}
                  onOrderChange={onOverdueDragOrder}
                  renderItem={(x) => (
                    <SortableRow key={x.key} id={String(x.key)}>
                      <ItemRow
                        title={x.type === "certificate" ? `📜 ${x.title}` : x.type === "task" ? `✓ ${x.title}` : `🧾 ${x.title}`}
                        subtitle={x.subtitle}
                        right={formatDMY(x.date)}
                        onClick={() => goTo(x.type, x.rawId)}
                      />
                    </SortableRow>
                  )}
                />
              </ScrollBox>
            )}
          </Card>
        </div>
      </RowSection>

      <RowSection id="row_upcoming_detentions" title="Upcoming & Detentions" defaultOpen={true}>
        <div style={{ display: "grid", gridTemplateColumns: isSmallScreen ? "1fr" : "1fr 1fr", gap: 14 }}>
          <Card
            title="Upcoming Expiries – 30 days"
            icon={Clock}
            right={
              <button
                type="button"
                onClick={() => {
                  setUpcoming30Mode("date");
                  setUpcomingNewestFirst((p) => {
                    const next = !p;
                    persistPatch(LIST_UPCOMING30, { mode: "date", newestFirst: next });
                    return next;
                  });
                }}
                style={{
                  height: 28,
                  padding: "0 10px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 900,
                  color: "#0f172a",
                }}
                title={upcomingNewestFirst ? "Sort: New → Old" : "Sort: Old → New"}
              >
                {upcomingNewestFirst ? "↓ New" : "↑ Old"}
              </button>
            }
          >

            {upcoming30Display.length === 0 ? (
              <div style={{ color: "#64748b", fontWeight: 900 }}>No upcoming expiries in the next 30 days.</div>
            ) : (
              <ScrollBox maxHeight={340}>
                <SortableList
                  items={upcoming30Display}
                  onOrderChange={onUpcoming30DragOrder}
                  renderItem={(x) => (
                    <SortableRow key={x.key} id={String(x.key)}>
                      <ItemRow
                        title={x.type === "certificate" ? `📜 ${x.title}` : x.type === "task" ? `✓ ${x.title}` : `🧾 ${x.title}`}
                        subtitle={x.subtitle}
                        right={formatDMY(x.date)}
                        onClick={() => goTo(x.type, x.rawId)}
                      />
                    </SortableRow>
                  )}
                />
              </ScrollBox>
            )}
          </Card>

          <Card
            title="Detentions"
            icon={Siren}
            right={
              <div style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setDetentionsNewestFirst((p) => !p)}
                  style={{
                    height: 28,
                    padding: "0 10px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "white",
                    cursor: "pointer",
                    fontWeight: 900,
                    color: "#0f172a",
                  }}
                  title={detentionsNewestFirst ? "Sort: New → Old" : "Sort: Old → New"}
                >
                  {detentionsNewestFirst ? "↓ New" : "↑ Old"}
                </button>

                <div style={{ fontSize: 12, fontWeight: 950, color: detentionsAll.length ? "#b91c1c" : "#334155" }}>
                  {detentionsAll.length} total
                </div>
              </div>
            }
          >
            {detentionsAll.length === 0 ? (
              <div style={{ color: "#64748b", fontWeight: 900 }}>No detentions.</div>
            ) : (
              <ScrollBox maxHeight={340}>
                {detentionsAll.map((r) => (
                  <ItemRow
                    key={`det-ytd-${r.id}`}
                    title={`${r.vessel || "Vessel"} — ${r.place || "—"}`}
                    subtitle={`Type: ${r.inspection_type || "—"}`}
                    right={formatDMY(r.date)}
                    onClick={() => goTo("inspection_report", r.id)}
                  />
                ))}
              </ScrollBox>
            )}            
          </Card>
        </div>
      </RowSection>

      <RowSection id="row_recent_reports_findings" title="Recent Activity" subtitle="Latest inspection reports and findings." defaultOpen={true}>
        <div style={{ display: "grid", gridTemplateColumns: isSmallScreen ? "1fr" : "1fr 1fr", gap: 14 }}>
          <Card
            title="Recent Inspection Reports"
            icon={FileText}
            right={
              <button
                type="button"
                onClick={() => setRecentReportsNewestFirst((p) => !p)}
                style={{
                  height: 28,
                  padding: "0 10px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 900,
                  color: "#0f172a",
                }}
                title={recentReportsNewestFirst ? "Sort: New → Old" : "Sort: Old → New"}
              >
                {recentReportsNewestFirst ? "↓ New" : "↑ Old"}
              </button>
            }
          >

            {recentReports.length === 0 ? (
              <div style={{ color: "#64748b", fontWeight: 900 }}>No inspection reports.</div>
            ) : (
              <ScrollBox maxHeight={340}>
                {recentReports.map((r) => (
                  <ItemRow
                    key={`rep-${r.id}`}
                    title={`${r.vessel || "Vessel"} — ${r.place || "—"}`}
                    subtitle={`${r.inspection_type || "—"}${isTruthy(readDetentionFlag(r)) ? " • Detention" : ""}`}
                    right={formatDMY(r.date)}
                    onClick={() => goTo("inspection_report", r.id)}
                  />
                ))}
              </ScrollBox>
            )}
          </Card>

          <Card
            title="Recent Inspection Findings"
            icon={ClipboardList}
            right={
              <button
                type="button"
                onClick={() => setRecentFindingsNewestFirst((p) => !p)}
                style={{
                  height: 28,
                  padding: "0 10px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 900,
                  color: "#0f172a",
                }}
                title={recentFindingsNewestFirst ? "Sort: New → Old" : "Sort: Old → New"}
              >
                {recentFindingsNewestFirst ? "↓ New" : "↑ Old"}
              </button>
            }
          >

            {recentFindings.length === 0 ? (
              <div style={{ color: "#64748b", fontWeight: 900 }}>No inspection findings.</div>
            ) : (
              <ScrollBox maxHeight={340}>
                {recentFindings.map((i) => (
                  <ItemRow
                    key={`find-${i.id}`}
                    title={`${i.vessel || "Vessel"} — ${i.place || "—"}`}
                    subtitle={i.description ? String(i.description).slice(0, 140) : "—"}
                    right={formatDMY(pickInspectionDate(i) || i.date)}
                    onClick={() => goTo("inspection", i.id)}
                  />
                ))}
              </ScrollBox>
            )}
          </Card>
        </div>
      </RowSection>

      {/* "+ Note" popup */}
      {showNewNote ? (
        <Modal title="New Note" onClose={() => setShowNewNote(false)}>
          <NoteCreateForm
            vessels={vesselOptions}
            onCancel={() => setShowNewNote(false)}
            onSave={(data) => createDashboardNote(data)}
          />
        </Modal>
      ) : null}

      <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>
        * This phase works with temporary data. Later we will connect it with Azure/SharePoint.
      </div>
    </div>
  );
}
