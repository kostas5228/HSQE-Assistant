// src/components/TaskStepsEditor.jsx
import React from "react";

function reorder(list, startIndex, endIndex) {
  const result = [...list];
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result.map((s, i) => ({ ...s, order: i + 1 }));
}

// Auto-resize helper: adjusts height to content
function autosize(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

export default function TaskStepsEditor({ steps = [], onChange }) {
  const [newText, setNewText] = React.useState("");
  const [dragIndex, setDragIndex] = React.useState(null);

  // keep refs to textareas to autosize on mount + updates
  const taRefs = React.useRef({});

  function emit(next) {
    onChange?.(
      [...next]
        .map((s, i) => ({ ...s, order: s.order ?? i + 1 }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    );
  }

  function addStep() {
    const text = newText.trim();
    if (!text) return;

    const next = [
      ...steps,
      {
        id: `s${Date.now()}${Math.floor(Math.random() * 1000)}`,
        text,
        done: false,
        order: steps.length + 1,
      },
    ];

    emit(next);
    setNewText("");
  }

  function toggleDone(id) {
    emit(steps.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));
  }

  function updateText(id, text) {
    emit(steps.map((s) => (s.id === id ? { ...s, text } : s)));
  }

  function removeStep(id) {
    emit(steps.filter((s) => s.id !== id));
  }

  function onDrop(toIndex) {
    if (dragIndex === null || dragIndex === toIndex) return;
    emit(reorder(steps, dragIndex, toIndex));
    setDragIndex(null);
  }

  // when steps change, autosize all visible textareas
  React.useEffect(() => {
    const ids = steps.map((s) => s.id);
    for (const id of ids) autosize(taRefs.current[id]);
  }, [steps]);

  const border = "#e5e7eb";
  const text = "#0f172a";
  const muted = "#64748b";

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: 10,
        background: "white",
      }}
    >
      {/* Add step row */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add step..."
          style={{
            flex: 1,
            height: 40,
            borderRadius: 10,
            border: `1px solid ${border}`,
            padding: "0 12px",
            fontSize: 14,
            outline: "none",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addStep();
            }
          }}
        />

        {/* Base44-like dark button */}
        <button
          type="button"
          onClick={addStep}
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            border: "1px solid #0f172a",
            background: "#0f172a",
            color: "white",
            fontWeight: 900,
            fontSize: 18,
            cursor: "pointer",
          }}
          title="Add step"
        >
          +
        </button>
      </div>

      {/* Steps list */}
      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {steps.map((s, idx) => (
          <div
            key={s.id}
            draggable
            onDragStart={() => setDragIndex(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(idx)}
            style={{
              display: "grid",
              gridTemplateColumns: "16px 18px 1fr 34px",
              gap: 8,
              alignItems: "start",
              padding: 8,
              border: `1px solid ${border}`,
              borderRadius: 12,
              background: "#ffffff",
            }}
            title="Σύρε & άφησε για αλλαγή σειράς"
          >
            <div style={{ cursor: "grab", opacity: 0.75, lineHeight: "18px", userSelect: "none" }}>
              ⋮⋮
            </div>

            <input
              type="checkbox"
              checked={!!s.done}
              onChange={() => toggleDone(s.id)}
              style={{ marginTop: 3 }}
            />

            {/* Auto-height textarea (no big empty space) */}
            <textarea
              ref={(el) => {
                taRefs.current[s.id] = el;
                autosize(el);
              }}
              value={s.text}
              onChange={(e) => {
                updateText(s.id, e.target.value);
                autosize(e.currentTarget);
              }}
              onInput={(e) => autosize(e.currentTarget)}
              rows={1}
              style={{
                width: "100%",
                border: `1px solid ${border}`,
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 14,
                outline: "none",

                // auto height
                resize: "none",
                overflow: "hidden",

                // wrap
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                wordBreak: "break-word",

                // smaller baseline height
                minHeight: 34,
                lineHeight: 1.3,

                textDecoration: s.done ? "line-through" : "none",
                color: s.done ? muted : text,
                background: "white",
              }}
            />

            <button
              type="button"
              onClick={() => removeStep(s.id)}
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                border: "1px solid #ef4444",
                background: "white",
                color: "#ef4444",
                fontWeight: 900,
                cursor: "pointer",
              }}
              title="Delete step"
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: muted }}>
        Σύρε & άφησε (drag & drop) για να αλλάξεις σειρά.
      </div>
    </div>
  );
}
