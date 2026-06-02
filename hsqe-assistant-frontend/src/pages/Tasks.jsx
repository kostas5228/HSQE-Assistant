// src/pages/Tasks.jsx
import { useSearchParams, useNavigate } from "react-router-dom";
import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listTasks, createTask, updateTask, deleteTask, getMe, getSettings } from "../api";
import TaskForm from "../components/TaskForm.jsx";
import { useDraft } from "../state/drafts";
import {
  Plus,
  Search,
  Sun,
  Star,
  Circle,
  CheckCircle,
  ListChecks,
  LayoutList,
  LayoutGrid,
  ArrowUpDown,
  Calendar,
  StickyNote,
  X,
  Pencil,
  Trash2,
  Pin,
  Palette,
} from "lucide-react";

/**
 * Tasks page with internal tabs: Tasks | Notes
 * - Tasks from API
 * - Notes stored in localStorage (hsqe_notes_v1)
 * - Notes: sort by created (default) or reminder (dropdown)
 * - focus highlight works via ?focus=<id> and section=notes
 */

// --------------------
// Design tokens (local)
// --------------------
const ui = {
  pageBg: "#f8fafc",
  cardBg: "white",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e5e7eb",
  border2: "#cbd5e1",
  blue900: "#1e3a8a",
  blue800: "#1e40af",
  pill: "#f1f5f9",
  shadowSm: "0 1px 0 rgba(2,6,23,0.04)",
  shadowMd: "0 10px 30px rgba(2,6,23,0.12)",
  radius: 14,
  radiusSm: 10,
  maxW: 980,
};

// --------------------
// Modal
// --------------------
function Modal({ title, children, onClose, headerRight = null, width = "min(920px, 100%)" }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,23,0.55)",
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
            borderBottom: `1px solid ${ui.border}`,
            padding: "14px 16px",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ fontWeight: 950, fontSize: 18, color: ui.text, whiteSpace: "nowrap" }}>{title}</div>
            {headerRight}
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              border: `1px solid ${ui.border}`,
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

// --------------------
// Date helpers
// --------------------
function parseDay(s) {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function todayStart() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function daysUntil(dateStr) {
  const t0 = todayStart();
  const d = parseDay(dateStr);
  if (!d) return null;
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - t0.getTime()) / (1000 * 60 * 60 * 24));
}

function nearestSortKey(task, sortMode) {
  const created = parseDay(task.created_at)?.getTime() ?? 0;
  const due = parseDay(task.due_date)?.getTime() ?? Number.POSITIVE_INFINITY;
  const rem = parseDay(task.reminder_at)?.getTime() ?? Number.POSITIVE_INFINITY;

  if (sortMode === "due") return due;
  if (sortMode === "reminder") return rem;
  return created;
}

// --------------------
// Steps reorder helper
// --------------------
function reorderStepsByIndex(list, startIndex, endIndex) {
  const result = [...list];
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result.map((s, i) => ({ ...s, order: i + 1 }));
}

// --------------------
// Small UI bits
// --------------------
function Pill({ children, style, title }) {
  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        border: `1px solid ${ui.border}`,
        background: ui.pill,
        color: ui.text,
        fontWeight: 800,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function PrimaryButton({ children, onClick, disabled, style, title, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        height: 40,
        padding: "0 14px",
        borderRadius: 12,
        border: `1px solid ${ui.blue900}`,
        background: ui.blue900,
        color: "white",
        fontWeight: 950,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.85 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = ui.blue800;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = ui.blue900;
      }}
    >
      {children}
    </button>
  );
}

function TextInput({ value, onChange, placeholder, style }) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        height: 42,
        borderRadius: 12,
        border: `1px solid ${ui.border}`,
        padding: "0 12px",
        outline: "none",
        fontWeight: 800,
        background: "white",
        color: ui.text,
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "#93c5fd";
        e.currentTarget.style.boxShadow = "0 0 0 4px rgba(59,130,246,0.12)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = ui.border;
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

function SelectInput({ value, onChange, children, style }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        height: 40,
        borderRadius: 12,
        border: `1px solid ${ui.border}`,
        padding: "0 12px",
        background: "white",
        fontWeight: 900,
        cursor: "pointer",
        color: ui.text,
        ...style,
      }}
    >
      {children}
    </select>
  );
}

function TabsPillBar({ children }) {
  return (
    <div
      style={{
        display: "inline-flex",
        gap: 6,
        background: "#e2e8f0",
        padding: 6,
        borderRadius: 14,
        flexWrap: "wrap",
      }}
    >
      {children}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 12,
        border: `1px solid ${active ? ui.border2 : "transparent"}`,
        background: active ? "white" : "transparent",
        boxShadow: active ? "0 1px 0 rgba(2,6,23,0.06)" : "none",
        fontWeight: 950,
        cursor: "pointer",
        color: ui.text,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function ViewToggle({ value, onChange }) {
  const wrap = {
    display: "inline-flex",
    border: `1px solid ${ui.border}`,
    borderRadius: 12,
    overflow: "hidden",
    background: "white",
  };

  const btn = (active) => ({
    width: 42,
    height: 40,
    border: "none",
    background: active ? ui.blue900 : "white",
    color: active ? "white" : ui.text,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
  });

  return (
    <div style={wrap}>
      <button type="button" onClick={() => onChange("list")} style={btn(value === "list")} title="List">
        <LayoutList size={18} />
      </button>
      <button type="button" onClick={() => onChange("grid")} style={btn(value === "grid")} title="Grid">
        <LayoutGrid size={18} />
      </button>
    </div>
  );
}

// --------------------
// Context menu
// --------------------
function ContextMenu({ x, y, onEdit, onDelete, onClose }) {
  const ref = React.useRef(null);

  React.useEffect(() => {
    function onDocMouseDown(e) {
      if (ref.current && ref.current.contains(e.target)) return;
      onClose?.();
    }
    function onEsc(e) {
      if (e.key === "Escape") onClose?.();
    }

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("scroll", onClose, true);
    document.addEventListener("keydown", onEsc);

    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("scroll", onClose, true);
      document.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 999,
        width: 210,
        background: "white",
        border: `1px solid ${ui.border}`,
        borderRadius: 14,
        boxShadow: "0 14px 40px rgba(2,6,23,0.18)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => {
          onEdit?.();
          onClose?.();
        }}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "12px 12px",
          border: "none",
          background: "white",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontWeight: 900,
          color: ui.text,
        }}
      >
        <Pencil size={16} />
        Edit
      </button>

      <div style={{ height: 1, background: "#f1f5f9" }} />

      <button
        type="button"
        onClick={() => {
          onDelete?.();
          onClose?.();
        }}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "12px 12px",
          border: "none",
          background: "white",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontWeight: 900,
          color: "#b91c1c",
        }}
      >
        <Trash2 size={16} />
        Delete
      </button>
    </div>
  );
}

// --------------------
// Task card
// --------------------
function TaskCard({ t, onToggleComplete, onOpenMenu, onOpenSteps }) {
  const dueDays = daysUntil(t.due_date);
  const isCompleted = t.status === "Completed";

  return (
    <div
      onContextMenu={(e) => onOpenMenu?.(e)}
      style={{
        border: `1px solid ${ui.border}`,
        borderRadius: ui.radius,
        padding: 14,
        background: ui.cardBg,
        boxShadow: ui.shadowSm,
        display: "flex",
        gap: 12,
        justifyContent: "space-between",
        userSelect: "none",
        minWidth: 0,
        opacity: isCompleted ? 0.6 : 1,
        transition: "box-shadow 160ms ease, transform 160ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = ui.shadowMd;
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = ui.shadowSm;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete?.();
          }}
          title="Complete"
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            border: `2px solid ${isCompleted ? "#22c55e" : "#94a3b8"}`,
            background: isCompleted ? "#22c55e" : "transparent",
            cursor: "pointer",
            marginTop: 1,
            flex: "0 0 auto",
            display: "grid",
            placeItems: "center",
            color: "white",
          }}
        >
          {isCompleted ? <CheckCircle size={18} /> : <Circle size={18} color="#94a3b8" />}
        </button>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSteps?.();
              }}
              style={{
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
                fontWeight: 950,
                whiteSpace: "normal",
                overflowWrap: "anywhere",
                color: ui.text,
                fontSize: 15,
                lineHeight: 1.25,
              }}
              title="Open steps"
            >
              {t.title || "Task"}
            </button>

            {t.important ? (
              <span title="Important" style={{ display: "inline-flex" }}>
                <Star size={16} color="#f59e0b" />
              </span>
            ) : null}

            {t.add_to_my_day ? (
              <span title="My Day" style={{ display: "inline-flex" }}>
                <Sun size={16} color="#f97316" />
              </span>
            ) : null}
          </div>

          {Array.isArray(t.steps) && t.steps.length ? (
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ color: ui.muted, fontSize: 12, fontWeight: 800 }}>
                {t.steps.filter((s) => s.done).length}/{t.steps.length} steps completed
              </span>
              
            </div>
          ) : null}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {(t.vessels || []).map((v) => (
              <Pill
                key={v}
                style={{
                  background: "#fff7ed",
                  borderColor: "#fed7aa",
                  color: "#7c2d12",
                }}
              >
                {v}
              </Pill>
            ))}

            {t.notes ? (
              <Pill
                style={{
                  background: "#fef9c3",
                  borderColor: "#fde047",
                  color: "#854d0e",
                }}
                title="Notes"
              >
                <StickyNote size={14} />
                Note
              </Pill>
            ) : null}

            {t.reminder_at ? (
              <Pill
                style={{
                  background: "#fff7ed",
                  borderColor: "#fdba74",
                  color: "#7c2d12",
                  fontWeight: 900,
                }}
                title="Reminder"
              >
                <Calendar size={14} />
                {String(t.reminder_at).replace("T", " ").slice(0, 16)}
              </Pill>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ textAlign: "right", flex: "0 0 auto", minWidth: 120 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 950,
            color: typeof dueDays === "number" && dueDays < 0 ? "#b91c1c" : ui.text,
          }}
        >
          {t.due_date || ""}
        </div>
        {typeof dueDays === "number" && dueDays < 0 ? (
          <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 900 }}>Overdue</div>
        ) : null}
      </div>
    </div>
  );
}

// --------------------
// Steps-only modal
// --------------------
function autosize(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function StepsOnly({ task, onToggleStep, onAddStep, onUpdateStepText, onReorder }) {
  const [newStep, setNewStep] = React.useState("");
  const [drafts, setDrafts] = React.useState({});
  const taRefs = React.useRef({});
  const [dragIndex, setDragIndex] = React.useState(null);

  React.useEffect(() => {
    setNewStep("");
    setDrafts({});
    taRefs.current = {};
    setDragIndex(null);
  }, [task?.id]);

  const steps = Array.isArray(task?.steps) ? task.steps : [];
  const sorted = steps.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const doneCount = sorted.filter((s) => s.done).length;

  function submitAdd(e) {
    e.preventDefault();
    const text = newStep.trim();
    if (!text) return;
    onAddStep?.(text);
    setNewStep("");
  }

  function startDraft(step) {
    setDrafts((p) => {
      if (p[step.id] !== undefined) return p;
      return { ...p, [step.id]: step.text ?? "" };
    });
    requestAnimationFrame(() => autosize(taRefs.current[step.id]));
  }

  function cancel(stepId) {
    setDrafts((p) => {
      const { [stepId]: _, ...rest } = p;
      return rest;
    });
  }

  function commit(step) {
    const raw = drafts[step.id];
    if (raw === undefined) return;

    const nextText = String(raw).trim();
    if (!nextText) {
      cancel(step.id);
      return;
    }

    if (nextText !== (step.text ?? "")) onUpdateStepText?.(step.id, nextText);
    cancel(step.id);
  }

  React.useEffect(() => {
    sorted.forEach((s) => autosize(taRefs.current[s.id]));
  }, [task?.id, sorted.length, drafts]);

  function onDrop(toIndex) {
    if (dragIndex === null || dragIndex === toIndex) return;
    onReorder?.(dragIndex, toIndex);
    setDragIndex(null);
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div style={{ fontWeight: 950, color: ui.text }}>Steps</div>
        <div style={{ color: ui.muted, fontSize: 12, fontWeight: 900 }}>
          {doneCount}/{sorted.length} completed
        </div>
      </div>

      <form onSubmit={submitAdd} style={{ display: "flex", gap: 10 }}>
        <TextInput value={newStep} onChange={(e) => setNewStep(e.target.value)} placeholder="Add step..." style={{ flex: 1, height: 42 }} />
        <PrimaryButton type="submit" style={{ width: 46, justifyContent: "center", padding: 0 }} title="Add step">
          <Plus size={18} />
        </PrimaryButton>
      </form>

      {sorted.length === 0 ? (
        <div style={{ color: ui.muted, fontWeight: 800 }}>No steps available.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {sorted.map((s, idx) => {
            const isEditing = drafts[s.id] !== undefined;
            const value = isEditing ? drafts[s.id] : (s.text ?? "");

            return (
              <div
                key={s.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(idx)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "18px 22px 1fr",
                  gap: 10,
                  alignItems: "start",
                  padding: 12,
                  borderRadius: 12,
                  border: `1px solid ${ui.border}`,
                  background: "white",
                }}
                onClick={() => {
                  if (!isEditing) startDraft(s);
                }}
                title={isEditing ? "" : "Click to edit • Drag from ⋮⋮ to reorder"}
              >
                <div
                  draggable={!isEditing}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", String(idx));
                    setDragIndex(idx);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    cursor: isEditing ? "default" : "grab",
                    opacity: 0.75,
                    lineHeight: "22px",
                    userSelect: "none",
                  }}
                >
                  ⋮⋮
                </div>

                <input
                  type="checkbox"
                  checked={!!s.done}
                  onChange={() => onToggleStep?.(s.id, !s.done)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ marginTop: 4 }}
                />

                {isEditing ? (
                  <textarea
                    ref={(el) => {
                      taRefs.current[s.id] = el;
                      autosize(el);
                    }}
                    value={value}
                    autoFocus
                    onChange={(e) => {
                      setDrafts((p) => ({ ...p, [s.id]: e.target.value }));
                      autosize(e.currentTarget);
                    }}
                    onInput={(e) => autosize(e.currentTarget)}
                    onBlur={() => commit(s)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.shiftKey) return;
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancel(s.id);
                        e.currentTarget.blur();
                      }
                    }}
                    rows={1}
                    style={{
                      width: "100%",
                      border: "1px solid #93c5fd",
                      boxShadow: "0 0 0 4px rgba(59,130,246,0.12)",
                      borderRadius: 10,
                      padding: "8px 10px",
                      fontWeight: 800,
                      outline: "none",
                      color: s.done ? ui.muted : ui.text,
                      textDecoration: s.done ? "line-through" : "none",
                      minWidth: 0,
                      resize: "none",
                      overflow: "hidden",
                      lineHeight: 1.35,
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                      background: "white",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      fontWeight: 800,
                      color: s.done ? ui.muted : ui.text,
                      textDecoration: s.done ? "line-through" : "none",
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                      lineHeight: 1.35,
                      minWidth: 0,
                    }}
                  >
                    {s.text}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ fontSize: 12, color: ui.muted, fontWeight: 800 }}>
        Tip: Click a step to edit • Shift+Enter=New line • Enter=Save • Esc=Cancel • Drag from ⋮⋮ to reorder
      </div>
    </div>
  );
}

// --------------------
// Notes storage (local)
// --------------------
const NOTES_KEY = "hsqe_notes_v1";

function emitNotesChanged() {
  try {
    window.dispatchEvent(new Event("hsqe_notes_changed"));
  } catch {
    // ignore
  }
}

// --------------------
// ✅ Session View Memory (in-memory + sessionStorage)
// - Persists only while the browser tab is open
// - When user closes the tab/browser, it resets
// --------------------
const TASKS_VIEW_KEY = "hsqe_tasks_view_v1";

function loadTasksViewSession() {
  try {
    const raw = sessionStorage.getItem(TASKS_VIEW_KEY);
    const obj = raw ? JSON.parse(raw) : null;
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function saveTasksViewSession(patch) {
  try {
    const current = loadTasksViewSession();
    const next = { ...current, ...patch };
    sessionStorage.setItem(TASKS_VIEW_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

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
    localStorage.setItem(NOTES_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function uid() {
  return `n${Math.floor(Math.random() * 1_000_000_000)}`;
}

const NOTE_COLORS = [
  { id: "slate", label: "Slate", bg: "#f1f5f9", border: "#cbd5e1" },
  { id: "amber", label: "Amber", bg: "#fffbeb", border: "#fcd34d" },
  { id: "green", label: "Green", bg: "#ecfdf5", border: "#6ee7b7" },
  { id: "blue", label: "Blue", bg: "#eff6ff", border: "#93c5fd" },
  { id: "rose", label: "Rose", bg: "#fff1f2", border: "#fda4af" },
];

// --------------------
// Note Form
// --------------------
function NoteForm({ initial, vessels, onCancel, onSave, saving }) {
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [body, setBody] = React.useState(initial?.body ?? "");
  const [vessel, setVessel] = React.useState(initial?.vessel ?? "");
  const [pinned, setPinned] = React.useState(!!initial?.pinned);
  const [reminder_at, setReminderAt] = React.useState(initial?.reminder_at ?? "");
  const [color, setColor] = React.useState(initial?.color ?? "slate");

  function submit(e) {
    e.preventDefault();
    const data = {
      title: title.trim(),
      body: body.trim(),
      vessel: vessel || "",
      pinned,
      reminder_at: reminder_at || "",
      color,
    };
    if (!data.title && !data.body) return;
    onSave?.(data);
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 950, color: ui.text }}>Title</div>
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title..." />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 950, color: ui.text }}>Notes</div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your note..."
          rows={4}
          style={{
            width: "100%",
            boxSizing: "border-box",
            borderRadius: 12,
            border: `1px solid ${ui.border}`,
            padding: 12,
            fontWeight: 800,
            outline: "none",
            resize: "vertical",
            color: ui.text,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#93c5fd";
            e.currentTarget.style.boxShadow = "0 0 0 4px rgba(59,130,246,0.12)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = ui.border;
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 950, color: ui.text }}>Vessel</div>
          <SelectInput value={vessel} onChange={(e) => setVessel(e.target.value)}>
            <option value="">—</option>
            {(vessels || []).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </SelectInput>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 950, color: ui.text }}>Reminder</div>
          <input
            type="datetime-local"
            value={reminder_at}
            onChange={(e) => setReminderAt(e.target.value)}
            style={{
              width: "100%",         
              boxSizing: "border-box",
              height: 42,
              borderRadius: 12,
              border: `1px solid ${ui.border}`,
              padding: "0 12px",
              fontWeight: 900,
              color: ui.text,
              background: "white",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 950, color: ui.text }}>
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          Pin
        </label>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 950, color: ui.text, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Palette size={16} /> Color
          </div>
          <SelectInput value={color} onChange={(e) => setColor(e.target.value)}>
            {NOTE_COLORS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </SelectInput>
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
            border: `1px solid ${ui.border}`,
            background: "white",
            fontWeight: 950,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <PrimaryButton type="submit" disabled={saving}>
          <StickyNote size={18} />
          Save
        </PrimaryButton>
      </div>
    </form>
  );
}

// --------------------
// Note Card
// --------------------
// --------------------
// Note Card
// --------------------
function NoteCard({ n, onOpenMenu }) {
  const color = NOTE_COLORS.find((c) => c.id === n.color) || NOTE_COLORS[0];

  const clamp = (lines) => ({
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  });

  return (
    <div
      onContextMenu={(e) => onOpenMenu?.(e)}
      style={{
        border: `1px solid ${color.border}`,
        background: color.bg,
        borderRadius: ui.radius,
        padding: 14,
        boxShadow: ui.shadowSm,
        minWidth: 0,
        userSelect: "none",
        transition: "box-shadow 160ms ease, transform 160ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = ui.shadowMd;
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = ui.shadowSm;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 980,
              color: ui.text,
              lineHeight: 1.2,
              ...clamp(3), // ✅ title max 3 lines
            }}
            title={n.title || ""}
          >
            {n.title || "Note"}
          </div>

          <div
            style={{
              marginTop: 6,
              color: "#334155",
              fontWeight: 800,
              fontSize: 13,
              lineHeight: 1.35,
              ...clamp(3), // ✅ body max 3 lines
            }}
            title={n.body || ""}
          >
            {n.body ? n.body : <span style={{ color: ui.muted }}>—</span>}
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, justifyItems: "end", flex: "0 0 auto" }}>
          {n.pinned ? (
            <span title="Pinned" style={{ display: "inline-flex" }}>
              <Pin size={18} />
            </span>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {n.vessel ? <Pill style={{ background: "rgba(255,255,255,0.65)" }}>{n.vessel}</Pill> : null}

        {n.reminder_at ? (
          <Pill style={{ background: "rgba(255,255,255,0.65)" }} title="Reminder">
            <Calendar size={14} />
            {String(n.reminder_at).replace("T", " ").slice(0, 16)}
          </Pill>
        ) : null}
      </div>
    </div>
  );
}

// --------------------
// Page
// --------------------
export default function Tasks() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });

  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const meEmail = String(me?.email || "").trim().toLowerCase();

  const allSettingsVessels = Array.isArray(settingsData?.vessels) ? settingsData.vessels : [];
  const myVesselsPerms = Array.isArray(me?.permissions?.vessels) ? me.permissions.vessels : ["ALL"];

  const vesselsList =
    me?.is_admin || myVesselsPerms.includes("ALL")
      ? allSettingsVessels
      : allSettingsVessels.filter((v) => myVesselsPerms.includes(v));
  const usersList = Array.isArray(settingsData?.users) ? settingsData.users : [];


  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const from = searchParams.get("from");
      // section is derived LATER (after sectionState exists)
  const sectionParam = searchParams.get("section");


   const [flashId, setFlashId] = React.useState(null);
  const rowRefs = React.useRef({});

   // --------------------
  // ✅ Session View Memory init (sessionStorage)
  // --------------------
  const viewSession = React.useMemo(() => loadTasksViewSession(), []);

  // ✅ sectionState FIRST (because section depends on it)
  const [sectionState, setSectionState] = React.useState(viewSession.section || "tasks");

  // derive section (URL wins, otherwise sessionState)
  const section =
    sectionParam === "notes"
      ? "notes"
      : sectionParam === "tasks"
      ? "tasks"
      : sectionState;

  // tasks UI state (session persisted)
  const [q, setQ] = React.useState(viewSession.q || "");
  const [tab, _setTab] = React.useState(viewSession.tab || "all");
  const [sortMode, _setSortMode] = React.useState(viewSession.sortMode || "created");
  const [view, _setView] = React.useState(viewSession.view || "list");

  // notes state (session persisted)
  const [notes, setNotes] = React.useState(() => loadNotes());
  const [noteQ, setNoteQ] = React.useState(viewSession.noteQ || "");
  const [noteSort, _setNoteSort] = React.useState(viewSession.noteSort || "created");

  // keep sectionState synced to URL if URL has section
  React.useEffect(() => {
    if (sectionParam === "tasks" || sectionParam === "notes") {
      setSectionState(sectionParam);
      saveTasksViewSession({ section: sectionParam });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionParam]);

  // setters that also persist to sessionStorage
  function setTab(next) {
    _setTab(next);
    saveTasksViewSession({ tab: next });
  }
  function setSortMode(next) {
    _setSortMode(next);
    saveTasksViewSession({ sortMode: next });
  }
  function setView(next) {
    _setView(next);
    saveTasksViewSession({ view: next });
  }
  function setNoteSort(next) {
    _setNoteSort(next);
    saveTasksViewSession({ noteSort: next });
  }

  const [showNew, setShowNew] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [openStepsTask, setOpenStepsTask] = React.useState(null);

  // Draft persistence for the "New Task" modal: keeps user's input when they
  // navigate away and reopens the modal automatically when they come back.
  const { draft: taskDraft, setDraft: setTaskDraft, clearDraft: clearTaskDraft } =
    useDraft("tasks-new");
  React.useEffect(() => {
    if (taskDraft && !showNew && !editing) setShowNew(true);
    // Only run on mount / when draft appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [menu, setMenu] = React.useState(null);
  const longPressRef = React.useRef({ timer: null, startX: 0, startY: 0 });

  const [showNewNote, setShowNewNote] = React.useState(false);
  const [editingNote, setEditingNote] = React.useState(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: listTasks,
  });

  // Keep openStepsTask in sync with the live tasks list.
  // Every time tasks refetches (e.g. after toggling complete or a step),
  // replace the stale snapshot so the modal title and steps stay correct.
  React.useEffect(() => {
    if (!openStepsTask) return;
    const fresh = tasks.find((t) => t.id === openStepsTask.id);
    if (fresh) setOpenStepsTask(fresh);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  
 function goSection(next) {
  // allow switching section even if a modal is open
  saveTasksViewSession({ section: next });
  setSectionState(next);

  const keep = new URLSearchParams(searchParams.toString());
  keep.set("section", next);

  // ✅ IMPORTANT:
  // When user manually switches section, we clear focus
  // so the "focus effect" doesn't force us back to Tasks.
  keep.delete("focus");

  navigate(`/tasks?${keep.toString()}`, { replace: true });
}


  // focus handling:
// - if focus is a NOTE id (starts with "n") and section not specified -> auto switch to notes
// - if focus matches a TASK -> ensure tasks tab + correct filter tab
React.useEffect(() => {
  if (!focusId) return;
  if (isLoading) return;

  // ✅ If URL doesn't explicitly set section, infer it from focusId
  if (sectionParam !== "tasks" && sectionParam !== "notes") {
    if (String(focusId).startsWith("n")) {
      if (section !== "notes") goSection("notes");
    }
  }

  // Task-only logic
  if (!tasks || tasks.length === 0) return;

  const t = tasks.find((x) => String(x.id) === String(focusId));
  if (!t) return;

  if (section !== "tasks") goSection("tasks");

  if (t.status === "Completed") setTab("completed");
  else setTab("all");

  if (q) setQ("");

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [focusId, isLoading, tasks, sectionParam, section]);

  function matchesSearch(t) {
    const hay = `${t.title || ""} ${(t.vessels || []).join(" ")} ${t.notes || ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function matchesTab(t) {
  const isCompleted = t.status === "Completed";

  if (tab === "completed") return isCompleted;
  if (tab === "all") return !isCompleted;
  if (tab === "myday") return !isCompleted && !!t.add_to_my_day;
  if (tab === "important") return !isCompleted && !!t.important;

  if (tab === "assigned") {
    if (!meEmail) return false;

    const assignedToMe =
      Array.isArray(t.assigned_to) &&
      t.assigned_to.map((x) => String(x).trim().toLowerCase()).includes(meEmail);

    const createdByMe = String(t.created_by || "").trim().toLowerCase() === meEmail;

    const hasAssignees = Array.isArray(t.assigned_to) && t.assigned_to.length > 0;
    if (!hasAssignees) return false;

    return !isCompleted && (assignedToMe || createdByMe);
  }

  return true;
}


  const counts = React.useMemo(() => {
  const nonCompleted = tasks.filter((t) => t.status !== "Completed");

  const all = nonCompleted.length;
  const myday = nonCompleted.filter((t) => !!t.add_to_my_day).length;
  const important = nonCompleted.filter((t) => !!t.important).length;

  const assigned = nonCompleted.filter((t) => {
    if (!meEmail) return false;

    const hasAssignees = Array.isArray(t.assigned_to) && t.assigned_to.length > 0;
    if (!hasAssignees) return false;

    const assignedToMe =
      Array.isArray(t.assigned_to) &&
      t.assigned_to.map((x) => String(x).trim().toLowerCase()).includes(meEmail);

    const createdByMe = String(t.created_by || "").trim().toLowerCase() === meEmail;

    return assignedToMe || createdByMe;
  }).length;

  const completed = tasks.filter((t) => t.status === "Completed").length;

  return { all, myday, important, assigned, completed };
}, [tasks, meEmail]);


  const filtered = tasks
    .filter(matchesSearch)
    .filter(matchesTab)
    .sort((a, b) => nearestSortKey(a, sortMode) - nearestSortKey(b, sortMode));

  // focus highlight/scroll
  React.useEffect(() => {
    if (!focusId) return;

    setFlashId(String(focusId));

    let tries = 0;
    const maxTries = 22;
    const id = setInterval(() => {
      tries += 1;
      const el = rowRefs.current[String(focusId)];
      if (el?.scrollIntoView) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        clearInterval(id);
      }
      if (tries >= maxTries) clearInterval(id);
    }, 100);

    const t = setTimeout(() => setFlashId(null), 2500);
      // ✅ After we highlight, clear focus from URL so it doesn't "lock" navigation
  const t2 = setTimeout(() => {
    try {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("focus");
      navigate(`/tasks?${next.toString()}`, { replace: true });
    } catch {
      // ignore
    }
  }, 2600);


    return () => {
      clearInterval(id);
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [focusId, section, tab, view, sortMode, q, filtered.length, noteQ, notes.length, noteSort]);

  const createMut = useMutation({
    mutationFn: createTask,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tasks"] });
      clearTaskDraft();
      setShowNew(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, input }) => updateTask(id, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteTask,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  function toggleComplete(t) {
    const nextStatus = t.status === "Completed" ? "Open" : "Completed";
    updateMut.mutate({ id: t.id, input: { status: nextStatus } });
  }

  function openMenuAt(x, y, task) {
    const pad = 8;
    const maxX = window.innerWidth - 220 - pad;
    const maxY = window.innerHeight - 140 - pad;
    setMenu({
      x: Math.max(pad, Math.min(x, maxX)),
      y: Math.max(pad, Math.min(y, maxY)),
      task,
    });
  }

  function handleContextMenu(e, task) {
    e.preventDefault();
    openMenuAt(e.clientX, e.clientY, task);
  }

  function onTouchStart(e, task) {
    const t = e.touches?.[0];
    if (!t) return;

    longPressRef.current.startX = t.clientX;
    longPressRef.current.startY = t.clientY;

    longPressRef.current.timer = window.setTimeout(() => {
      openMenuAt(t.clientX, t.clientY, task);
      longPressRef.current.timer = null;
    }, 450);
  }

  function clearLongPress() {
    if (longPressRef.current.timer) {
      clearTimeout(longPressRef.current.timer);
      longPressRef.current.timer = null;
    }
  }

  function onTouchMove(e) {
    const t = e.touches?.[0];
    if (!t) return;

    const dx = Math.abs(t.clientX - longPressRef.current.startX);
    const dy = Math.abs(t.clientY - longPressRef.current.startY);
    if (dx > 8 || dy > 8) clearLongPress();
  }

  function toggleStep(task, stepId, nextDone) {
    const steps = Array.isArray(task.steps) ? task.steps : [];
    const nextSteps = steps.map((s) => (s.id === stepId ? { ...s, done: nextDone } : s));
    updateMut.mutate({ id: task.id, input: { steps: nextSteps } });

    setOpenStepsTask((prev) => (prev?.id === task.id ? { ...prev, steps: nextSteps } : prev));
  }

  function updateStepText(task, stepId, nextText) {
    const steps = Array.isArray(task.steps) ? task.steps : [];
    const nextSteps = steps.map((s) => (s.id === stepId ? { ...s, text: nextText } : s));
    updateMut.mutate({ id: task.id, input: { steps: nextSteps } });

    setOpenStepsTask((prev) => (prev?.id === task.id ? { ...prev, steps: nextSteps } : prev));
  }

  function reorderSteps(task, fromIndex, toIndex) {
    const steps = Array.isArray(task.steps) ? task.steps : [];
    const sorted = steps.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const nextSteps = reorderStepsByIndex(sorted, fromIndex, toIndex);

    updateMut.mutate({ id: task.id, input: { steps: nextSteps } });
    setOpenStepsTask((prev) => (prev?.id === task.id ? { ...prev, steps: nextSteps } : prev));
  }

  function addStep(task, text) {
    const steps = Array.isArray(task.steps) ? task.steps : [];
    const maxOrder = steps.reduce((m, s) => Math.max(m, Number(s.order || 0)), 0);
    const next = {
      id: `s${Math.floor(Math.random() * 1000000)}`,
      text,
      done: false,
      order: maxOrder + 1,
    };
    const nextSteps = [...steps, next];
    updateMut.mutate({ id: task.id, input: { steps: nextSteps } });

    setOpenStepsTask((prev) => (prev?.id === task.id ? { ...prev, steps: nextSteps } : prev));
  }

  // --------------------
  // Notes CRUD
  // --------------------
  function createNote(data) {
    const now = new Date().toISOString();
    const n = {
      id: uid(),
      title: data.title || "",
      body: data.body || "",
      vessel: data.vessel || "",
      pinned: !!data.pinned,
      reminder_at: data.reminder_at || "",
      color: data.color || "slate",
      created_at: now,
      updated_at: now,
    };
  
    setNotes((prev) => {
      const next = [n, ...prev];
      // save now (immediately) + event, not "later" in effect
      saveNotes(next);
      emitNotesChanged();
      return next;
    });
  
    setShowNewNote(false);
    emitNotesChanged();
  }


  function updateNote(id, patch) {
    setNotes((prev) => {
      const next = prev.map((n) =>
        n.id === id ? { ...n, ...patch, updated_at: new Date().toISOString() } : n
      );
      saveNotes(next);
      emitNotesChanged();
      return next;
    });
  
    setEditingNote(null);
    emitNotesChanged();
  }


  function deleteNote(id) {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      saveNotes(next);
      emitNotesChanged();
      return next;
    });
  }



  
  // ✅ Notes filtering + sorting
  const filteredNotes = React.useMemo(() => {
    const q2 = noteQ.trim().toLowerCase();
    const list = notes.filter((n) => {
      if (!q2) return true;
      const hay = `${n.title || ""} ${n.body || ""} ${n.vessel || ""}`.toLowerCase();
      return hay.includes(q2);
    });

    const createdDesc = (a, b) => String(b.created_at || "").localeCompare(String(a.created_at || ""));
    const reminderAsc = (a, b) => String(a.reminder_at || "").localeCompare(String(b.reminder_at || ""));

    list.sort((a, b) => {
      // pinned first always
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;

      if (noteSort === "reminder") {
        const aHas = !!a.reminder_at;
        const bHas = !!b.reminder_at;

        // reminders first
        if (aHas !== bHas) return aHas ? -1 : 1;

        // both have reminders -> soonest first
        if (aHas && bHas) return reminderAsc(a, b);

        // none has reminders -> newest first
        return createdDesc(a, b);
      }

      // default created: newest first
      return createdDesc(a, b);
    });

    return list;
  }, [notes, noteQ, noteSort]);

  // --------------------
  // Layout styles
  // --------------------
  const listWrapStyle =
    view === "grid"
      ? { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }
      : { display: "grid", gap: 12, gridTemplateColumns: "1fr" };

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", background: ui.pageBg }}>
      <div style={{ maxWidth: ui.maxW, margin: "0 auto", padding: 20, display: "grid", gap: 16 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ border: `1px solid ${ui.border}`, borderRadius: 14, padding: 6, background: "white", display: "inline-flex", gap: 6, width: "fit-content" }}>
            <button type="button" onClick={() => goSection("tasks")} style={{ padding: "8px 12px", borderRadius: 12, border: `1px solid ${section === "tasks" ? ui.border2 : "transparent"}`, background: section === "tasks" ? "#f8fafc" : "transparent", fontWeight: 950, cursor: "pointer", color: ui.text, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <ListChecks size={16} /> Tasks
            </button>
            <button type="button" onClick={() => goSection("notes")} style={{ padding: "8px 12px", borderRadius: 12, border: `1px solid ${section === "notes" ? ui.border2 : "transparent"}`, background: section === "notes" ? "#f8fafc" : "transparent", fontWeight: 950, cursor: "pointer", color: ui.text, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <StickyNote size={16} /> Notes
            </button>
          </div>

          {section === "tasks" ? (
            <PrimaryButton onClick={() => setShowNew(true)}><Plus size={18} /> New Task</PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => setShowNewNote(true)}><Plus size={18} /> New Note</PrimaryButton>
          )}
        </div>
          
        {/* SEARCH */}
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <div style={{ position: "relative", width: "min(640px, 100%)" }}>
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: ui.muted, display: "grid", placeItems: "center" }}>
              <Search size={18} />
            </div>

            {section === "tasks" ? (
            <TextInput
              placeholder="Search tasks..."
              value={q}
              onChange={(e) => {
                const v = e.target.value;
                setQ(v);
                saveTasksViewSession({ q: v });
              }}
              style={{ width: "100%", paddingLeft: 40 }}
            />
            
            ) : (
            <TextInput
              placeholder="Search notes..."
              value={noteQ}
              onChange={(e) => {
                const v = e.target.value;
                setNoteQ(v);
                saveTasksViewSession({ noteQ: v });
              }}
              style={{ width: "100%", paddingLeft: 40 }}
            />

            )}
          </div>
        </div>

        {/* Controls row */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          {section === "tasks" ? (
            <TabsPillBar>
              <TabButton active={tab === "all"} onClick={() => setTab("all")}>
                All <span style={{ color: ui.muted, fontWeight: 900 }}>({counts.all})</span>
              </TabButton>

              <TabButton active={tab === "myday"} onClick={() => setTab("myday")}>
                <Sun size={16} />
                My Day <span style={{ color: ui.muted, fontWeight: 900 }}>({counts.myday})</span>
              </TabButton>

              <TabButton active={tab === "important"} onClick={() => setTab("important")}>
                <Star size={16} />
                Important <span style={{ color: ui.muted, fontWeight: 900 }}>({counts.important})</span>
              </TabButton>

              <TabButton active={tab === "assigned"} onClick={() => setTab("assigned")}>
                <Circle size={16} />
                Assigned <span style={{ color: ui.muted, fontWeight: 900 }}>({counts.assigned})</span>
              </TabButton>

              <TabButton active={tab === "completed"} onClick={() => setTab("completed")}>
                <CheckCircle size={16} />
                Completed <span style={{ color: ui.muted, fontWeight: 900 }}>({counts.completed})</span>
              </TabButton>
            </TabsPillBar>
          ) : (
            <div style={{ display: "flex", gap: 10, alignItems: "center", color: ui.muted, fontWeight: 900 }}>
              <Pin size={16} /> Pinned first • {filteredNotes.length} notes
            </div>
          )}

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            {section === "tasks" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ArrowUpDown size={18} color={ui.muted} />
                <SelectInput value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
                  <option value="created">Creation order</option>
                  <option value="due">Due Date</option>
                  <option value="reminder">Reminder</option>
                </SelectInput>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ArrowUpDown size={18} color={ui.muted} />
                <SelectInput value={noteSort} onChange={(e) => setNoteSort(e.target.value)}>
                  <option value="created">Sort: Created</option>
                  <option value="reminder">Sort: Reminder</option>
                </SelectInput>
              </div>
            )}

            <ViewToggle value={view} onChange={setView} />
          </div>
        </div>

        {/* CONTENT */}
        {section === "tasks" ? (
          <div style={listWrapStyle}>
            {isLoading ? (
              <div style={{ color: ui.muted, fontWeight: 800 }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ color: ui.muted, fontWeight: 800 }}>No tasks found.</div>
            ) : (
              filtered.map((t) => (
                <div
                  key={t.id}
                  ref={(node) => {
                    if (node) rowRefs.current[String(t.id)] = node;
                  }}
                  onTouchStart={(e) => onTouchStart(e, t)}
                  onTouchMove={onTouchMove}
                  onTouchEnd={clearLongPress}
                  onTouchCancel={clearLongPress}
                  style={{
                    minWidth: 0,
                    borderRadius: 12,
                    outline: flashId === String(t.id) ? "2px solid rgba(59,130,246,0.9)" : "none",
                    boxShadow: flashId === String(t.id) ? "0 10px 30px rgba(59,130,246,0.15)" : "none",
                    transition: "all 180ms ease",
                  }}
                >
                  <TaskCard
                    t={t}
                    onToggleComplete={() => toggleComplete(t)}
                    onOpenMenu={(e) => handleContextMenu(e, t)}
                    onOpenSteps={() => setOpenStepsTask(t)}
                  />
                </div>
              ))
            )}
          </div>
        ) : (
          <div style={listWrapStyle}>
            {filteredNotes.length === 0 ? (
              <div style={{ color: ui.muted, fontWeight: 800 }}>No notes found.</div>
            ) : (
              filteredNotes.map((n) => (
                <div
                  key={n.id}
                  ref={(node) => {
                    if (node) rowRefs.current[String(n.id)] = node;
                  }}
                  style={{
                    minWidth: 0,
                    borderRadius: 12,
                    outline: flashId === String(n.id) ? "2px solid rgba(59,130,246,0.9)" : "none",
                    boxShadow: flashId === String(n.id) ? "0 10px 30px rgba(59,130,246,0.15)" : "none",
                    transition: "all 180ms ease",
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    const pad = 8;
                    const maxX = window.innerWidth - 220 - pad;
                    const maxY = window.innerHeight - 140 - pad;
                    setMenu({
                      x: Math.max(pad, Math.min(e.clientX, maxX)),
                      y: Math.max(pad, Math.min(e.clientY, maxY)),
                      task: { __note: true, data: n },
                    });
                  }}
                >
                  <NoteCard
                    n={n}
                    onOpenMenu={(e) => {
                      e.preventDefault();
                      const pad = 8;
                      const maxX = window.innerWidth - 220 - pad;
                      const maxY = window.innerHeight - 140 - pad;
                      setMenu({
                        x: Math.max(pad, Math.min(e.clientX, maxX)),
                        y: Math.max(pad, Math.min(e.clientY, maxY)),
                        task: { __note: true, data: n },
                      });
                    }}
                  />
                </div>
              ))
            )}
          </div>
        )}

        {/* Context menu */}
        {menu ? (
          <ContextMenu
            x={menu.x}
            y={menu.y}
            onClose={() => setMenu(null)}
            onEdit={() => {
              if (menu.task?.__note) setEditingNote(menu.task.data);
              else setEditing(menu.task);
            }}
            onDelete={() => {
              if (menu.task?.__note) deleteNote(menu.task.data.id);
              else deleteMut.mutate(menu.task.id);
            }}
          />
        ) : null}

        {/* New Task */}
        {showNew ? (
          <Modal
            title="New Task"
            onClose={() => setShowNew(false)}
            headerRight={
              taskDraft ? (
                <button
                  type="button"
                  onClick={() => {
                    clearTaskDraft();
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
            <TaskForm
              initial={taskDraft || {}}
              saving={createMut.isPending}
              onCancel={() => setShowNew(false)}
              onSave={(data) => createMut.mutate(data)}
              onDraftChange={(data) => setTaskDraft(data)}
              vesselsOptions={vesselsList}
              usersOptions={usersList}
              meEmail={me?.email || ""}
            />

          </Modal>
        ) : null}

        {/* Edit Task */}
        {editing ? (
          <Modal title="Edit Task" onClose={() => setEditing(null)}>
            <TaskForm
              initial={editing}
              saving={updateMut.isPending}
              onCancel={() => setEditing(null)}
              onSave={(data) => updateMut.mutate({ id: editing.id, input: data })}
              vesselsOptions={vesselsList}
              usersOptions={usersList}
              meEmail={me?.email || ""}
            />

          </Modal>
        ) : null}

        {/* Steps-only modal */}
        {openStepsTask ? (
          <Modal title={openStepsTask.title || "Steps"} onClose={() => setOpenStepsTask(null)} width="min(720px, 100%)">
            <StepsOnly
              task={openStepsTask}
              onToggleStep={(stepId, nextDone) => toggleStep(openStepsTask, stepId, nextDone)}
              onAddStep={(text) => addStep(openStepsTask, text)}
              onUpdateStepText={(stepId, text) => updateStepText(openStepsTask, stepId, text)}
              onReorder={(fromIdx, toIdx) => reorderSteps(openStepsTask, fromIdx, toIdx)}
            />
          </Modal>
        ) : null}

        {/* New Note */}
        {showNewNote ? (
          <Modal
          title="New Note"
          onClose={() => setShowNewNote(false)}
          width="min(720px, 100%)"
          >
          <NoteForm
            vessels={vesselsList}
            saving={false}
            onCancel={() => setShowNewNote(false)}
            onSave={(data) => createNote(data)}
          />
        </Modal>
      ) : null}


        {/* Edit Note */}
        {editingNote ? (
          <Modal title="Edit Note" onClose={() => setEditingNote(null)} width="min(720px, 100%)">
            <NoteForm
              initial={editingNote}
              vessels={vesselsList}
              saving={false}
              onCancel={() => setEditingNote(null)}
              onSave={(data) => updateNote(editingNote.id, data)}
            />
          </Modal>
        ) : null}
      </div>
    </div>
  );
}
