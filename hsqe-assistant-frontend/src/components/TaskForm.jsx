import React from "react";
import TaskStepsEditor from "./TaskStepsEditor.jsx";

function ui() {
  return {
    text: "#0f172a",
    muted: "#64748b",
    border: "#e5e7eb",
    bg: "#ffffff",
    page: "#f8fafc",

    blue900: "#1e3a8a",
    blue800: "#1d4ed8",

    orangeBg: "#fff7ed",
    yellowBg: "#fefce8",
    blueSoftBg: "#eff6ff",

    radius: 12,
  };
}

function Label({ children }) {
  const t = ui();
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 6 }}>
      {children}
    </div>
  );
}

function InputBaseStyle() {
  const t = ui();
  return {
    height: 42,
    borderRadius: 10,
    border: `1px solid ${t.border}`,
    padding: "0 12px",
    fontSize: 14,
    outline: "none",
    background: "white",
    color: t.text,
  };
}

function TextareaBaseStyle() {
  const t = ui();
  return {
    borderRadius: 10,
    border: `1px solid ${t.border}`,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    background: "white",
    color: t.text,
    resize: "vertical",
  };
}

function PopoverMultiSelect({ label, placeholder, options, values, onChange, renderOption }) {
  const t = ui();
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);

  React.useEffect(() => {
    function onDocDown(e) {
      if (!wrapRef.current) return;
      if (wrapRef.current.contains(e.target)) return;
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

  function toggle(val) {
    const exists = values.includes(val);
    const next = exists ? values.filter((v) => v !== val) : [...values, val];
    onChange(next);
    // όπως ζήτησες: κλείνει μόλις επιλέξεις κάτι
    setOpen(false);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "grid" }}>
      <Label>{label}</Label>

      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          ...InputBaseStyle(),
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <span style={{ color: values.length ? t.text : "#94a3b8", fontWeight: values.length ? 700 : 600 }}>
          {values.length ? `${values.length} selected` : placeholder}
        </span>
        <span style={{ opacity: 0.75, fontSize: 14 }}>▾</span>
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "white",
            border: `1px solid ${t.border}`,
            borderRadius: 14,
            padding: 8,
            boxShadow: "0 14px 32px rgba(2,6,23,0.16)",
            maxHeight: 260,
            overflow: "auto",
          }}
        >
          {options.map((opt) => {
            const value = opt.value ?? opt;
            const checked = values.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggle(value)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 10px",
                  borderRadius: 12,
                  border: "none",
                  background: checked ? "#f1f5f9" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <input type="checkbox" checked={checked} readOnly />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {renderOption ? renderOption(opt) : String(value)}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function autosize(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}
export default function TaskForm({
  initial = {},
  onCancel,
  onSave,
  saving,
  vesselsOptions = [],
  usersOptions = [],
  meEmail = "",
  onDraftChange,
}) {
  const t = ui();
  const notesRef = React.useRef(null);

  const [form, setForm] = React.useState({
    title: initial.title || "",
    steps: Array.isArray(initial.steps) ? initial.steps : [],

    add_to_my_day: !!initial.add_to_my_day,
    important: !!initial.important,

    vessels: Array.isArray(initial.vessels) ? initial.vessels : initial.vessel ? [initial.vessel] : [],
    assigned_to: Array.isArray(initial.assigned_to) ? initial.assigned_to : [],
    visible_to_assignee: !!initial.visible_to_assignee,

    due_date: initial.due_date || "",
    reminder_at: initial.reminder_at || "",

    notes: initial.notes || "",
    status: initial.status || "Open",
  });

  function setField(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  // Notify parent so a draft can be persisted across navigation.
  // Skip the very first call so we don't persist an empty/initial draft.
  React.useEffect(() => {
    autosize(notesRef.current);
  }, [form.notes]);
  
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
    const clean = {
      ...form,
      assigned_to: form.assigned_to.length ? form.assigned_to[0] : null, // ← fix: send null if no one assigned
      visible_to_assignee: form.assigned_to.length ? !!form.visible_to_assignee : false,
    };
    onSave?.(clean);
  }

  const norm = (v) => String(v || "").trim().toLowerCase();

  const showVisibleToAssignee =
    form.assigned_to.length > 0 &&
    !(form.assigned_to.length === 1 && norm(form.assigned_to[0]) === norm(meEmail));


  // small helper for “pill blocks”
  const toggleCard = (bg) => ({
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "12px 14px",
    border: `1px solid ${t.border}`,
    borderRadius: 12,
    background: bg,
  });

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
      {/* Title */}
      <div style={{ display: "grid" }}>
        <input
          value={form.title}
          onChange={(e) => setField("title", e.target.value)}
          style={{
            ...InputBaseStyle(),
            fontWeight: 700,
          }}
          placeholder="Title *"
          required
        />
      </div>

      {/* Steps */}
      <TaskStepsEditor steps={form.steps} onChange={(next) => setField("steps", next)} />

      {/* Add to My Day + Important */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <button
          type="button"
          onClick={() => setField("add_to_my_day", !form.add_to_my_day)}
          style={{
            ...toggleCard(t.orangeBg),
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: 999,
              border: "2px solid #0f172a",
              background: form.add_to_my_day ? "#0f172a" : "transparent",
              boxShadow: form.add_to_my_day ? "inset 0 0 0 4px rgba(255,255,255,0.95)" : "none",
              flex: "0 0 auto",
            }}
          />
          <span style={{ fontWeight: 800, color: t.text }}>Add to My Day</span>
          <span style={{ marginLeft: "auto", color: "#f97316", fontWeight: 900 }}>☀︎</span>
        </button>

        <button
          type="button"
          onClick={() => setField("important", !form.important)}
          style={{
            ...toggleCard(t.yellowBg),
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <input
            type="checkbox"
            checked={form.important}
            readOnly
            style={{ width: 16, height: 16 }}
          />
          <span style={{ fontWeight: 800, color: t.text }}>Important</span>
          <span style={{ marginLeft: "auto", color: "#eab308", fontWeight: 900 }}>★</span>
        </button>
      </div>

      {/* Vessels + Assigned */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <PopoverMultiSelect
          label="Vessels"
          placeholder="Select vessels"
          options={vesselsOptions}
          values={form.vessels}
          onChange={(next) => setField("vessels", next)}
        />

        <PopoverMultiSelect
          label="Assign to..."
          placeholder="Select user"
          options={usersOptions
            .filter((u) => u && u.email)
            .map((u) => ({ value: u.email, ...u }))}

          values={form.assigned_to}
          onChange={(next) => {
            setField("assigned_to", next);
            if (next.length) setField("visible_to_assignee", true);
          }}
          renderOption={(u) => (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: t.text }}>{u.full_name}</div>
              <div style={{ fontSize: 12, color: t.muted, whiteSpace: "nowrap" }}>{u.email}</div>
            </div>
          )}
        />
      </div>

      {/* Visible to assignee */}
      {showVisibleToAssignee ? (
        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            padding: "12px 14px",
            borderRadius: 12,
            background: t.blueSoftBg,
            border: "1px solid #dbeafe",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={form.visible_to_assignee}
            onChange={(e) => setField("visible_to_assignee", e.target.checked)}
          />
          <span style={{ fontWeight: 800, color: t.text }}>Visible to assigned user</span>
        </label>
      ) : null}

      {/* Dates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ display: "grid" }}>
          <Label>Due date</Label>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => setField("due_date", e.target.value)}
            style={InputBaseStyle()}
          />
        </div>

        <div style={{ display: "grid" }}>
          <Label>Reminder</Label>
          <input
            type="datetime-local"
            value={form.reminder_at}
            onChange={(e) => setField("reminder_at", e.target.value)}
            style={InputBaseStyle()}
          />
        </div>
      </div>

      {/* Attachments bar */}
      <div
        style={{
          padding: "12px 14px",
          borderRadius: 12,
          background: "#f1f5f9",
          border: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: t.text,
        }}
      >
        <span style={{ fontSize: 16 }}>📎</span>
        <div style={{ fontWeight: 900 }}>Attachments</div>
        <span style={{ fontWeight: 500, color: t.muted }}>
          (mock UI for now – will be connected later with SharePoint/Graph)
        </span>
      </div>

      {/* Notes */}
      <div style={{ display: "grid" }}>
        <Label>Notes</Label>
        <textarea
          ref={notesRef}
          value={form.notes}
          onChange={(e) => {
            setField("notes", e.target.value);
            autosize(e.currentTarget);
          }}
          placeholder="Notes..."
          rows={1}
          style={{
            ...TextareaBaseStyle(),
            resize: "none",
            overflow: "hidden",
            minHeight: 42,
          }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            height: 42,
            padding: "0 14px",
            borderRadius: 10,
            border: `1px solid ${t.border}`,
            background: "white",
            fontWeight: 800,
            cursor: "pointer",
            color: t.text,
          }}
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          style={{
            height: 42,
            padding: "0 16px",
            borderRadius: 10,
            border: "1px solid #1e3a8a",
            background: t.blue900,
            color: "white",
            fontWeight: 900,
            cursor: saving ? "not-allowed" : "pointer",
            boxShadow: "0 10px 18px rgba(30,58,138,0.18)",
            opacity: saving ? 0.75 : 1,
          }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
