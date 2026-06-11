// src/components/DashboardCalendar.jsx
import React from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { format, parse, startOfWeek, getDay, addMinutes } from "date-fns";
import { el } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Dot,
  CheckCheck,
  BookX,
  StickyNote,
  ScrollText,
} from "lucide-react";

const locales = { el };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { locale: el }),
  getDay,
  locales,
});

function asArray(v) {
  return Array.isArray(v) ? v : v ? [v] : [];
}

function safeDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function clampToDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function makeAllDayDate(d) {
  const start = clampToDay(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

// --------------------
// Notes storage (local) — must match Tasks page key
// --------------------
const NOTES_KEY = "hsqe_notes_v1";

function loadNotesSafe() {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(NOTES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// --------------------
// Calendar prefs persistence (sessionStorage)
// --------------------
const CAL_PREFS_KEY = "hsqe_calendar_prefs_v1";

const DEFAULT_FILTERS = {
  certsDue: true,
  tasksReminder: true,
  tasksDue: true,
  notesReminder: true,
};

function loadCalendarPrefs() {
  try {
    const raw = sessionStorage.getItem(CAL_PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCalendarPrefs(prefs) {
  try {
    sessionStorage.setItem(CAL_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

// --------------------
// Icons + Colors
// --------------------
const ICONS = {
  taskReminder: CheckCheck,
  taskDue: BookX,
  note: StickyNote,
  cert: ScrollText,
};

const COLOR_CERT = "#ec4899";
const COLOR_TASK = "#f97316";
const COLOR_TASK_DUE = "#ff1a1a";
const COLOR_NOTE = "#facc15";

function formatHMSS(d) {
  try {
    return format(d, "HH:mm:ss");
  } catch {
    return "";
  }
}

// ----------
// Toolbar
// ----------
function Toolbar({ label, onNavigate, onView, view, date }) {
  const [open, setOpen] = React.useState(false);
  const [picker, setPicker] = React.useState("");
  const [tick, setTick] = React.useState(0);

  const popoverRef = React.useRef(null);
  const labelBtnRef = React.useRef(null);

  React.useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  function formatRangeLabel(labelText) {
    try {
      const base = date instanceof Date ? date : new Date();

      if (view === Views.MONTH) return format(base, "MMM yyyy", { locale: el });
      if (view === Views.DAY) return format(base, "dd MMM yyyy", { locale: el });

      const start = startOfWeek(base, { locale: el });
      const end = new Date(start);
      const spanDays = view === Views.WORK_WEEK ? 4 : 6;
      end.setDate(end.getDate() + spanDays);

      const sameYear = start.getFullYear() === end.getFullYear();
      const sameMonth = start.getMonth() === end.getMonth();

      if (sameYear && sameMonth)
        return `${format(start, "dd", { locale: el })}–${format(end, "dd MMM yyyy", { locale: el })}`;
      if (sameYear && !sameMonth)
        return `${format(start, "dd MMM", { locale: el })} – ${format(end, "dd MMM yyyy", { locale: el })}`;
      return `${format(start, "dd MMM yyyy", { locale: el })} – ${format(end, "dd MMM yyyy", { locale: el })}`;
    } catch {
      return labelText;
    }
  }

  React.useEffect(() => {
    try {
      const d = date instanceof Date ? date : new Date();
      setPicker(format(d, "yyyy-MM-dd"));
    } catch {
      setPicker("");
    }
  }, [label, view, date]);

  React.useEffect(() => {
    function onEsc(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e) {
      const t = e.target;
      if (popoverRef.current?.contains(t)) return;
      if (labelBtnRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const iconBtn = {
    width: 34, height: 34, borderRadius: 10, border: "1px solid #e5e7eb",
    background: "white", display: "grid", placeItems: "center",
    cursor: "pointer", userSelect: "none", lineHeight: 1,
  };

  const btn = (active) => ({
    border: "1px solid #e5e7eb", borderRadius: 10, padding: "7px 10px",
    fontWeight: 900, background: active ? "#0f172a" : "white",
    color: active ? "white" : "#0f172a", cursor: "pointer",
    lineHeight: 1, userSelect: "none",
  });

  function applyPicker() {
    if (!picker) return;
    const d = new Date(picker);
    if (Number.isNaN(d.getTime())) return;
    onNavigate?.("DATE", d);
    setOpen(false);
  }

  return (
    <div
      className="rbc-toolbar"
      style={{
        display: "flex", justifyContent: "space-between", gap: 10,
        alignItems: "center", flexWrap: "nowrap", padding: "8px 10px",
        borderBottom: "1px solid #e5e7eb", position: "relative",
      }}
    >
      <div style={{ display: "inline-flex", gap: 8, alignItems: "center", flex: "0 0 auto" }}>
        <button type="button" style={iconBtn} onClick={() => onNavigate("PREV")} title="Back" aria-label="Back">
          <ChevronLeft size={18} />
        </button>
        <button type="button" style={iconBtn} onClick={() => onNavigate("TODAY")} title="Today" aria-label="Today">
          <Dot size={22} />
        </button>
        <button type="button" style={iconBtn} onClick={() => onNavigate("NEXT")} title="Next" aria-label="Next">
          <ChevronRight size={18} />
        </button>
      </div>

      <div style={{ display: "inline-flex", gap: 10, alignItems: "center", minWidth: 0 }}>
        <button
          ref={labelBtnRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rbc-toolbar-label"
          style={{
            fontWeight: 900, fontSize: 13, color: "#334155", whiteSpace: "nowrap",
            border: "1px solid #e5e7eb", borderRadius: 12, padding: "6px 10px",
            background: "white", cursor: "pointer", userSelect: "none",
            overflow: "hidden", textOverflow: "ellipsis", maxWidth: 360,
          }}
          title="Click to go to date"
        >
          {formatRangeLabel(label)}
        </button>

        <div
          style={{
            padding: "6px 10px", borderRadius: 12, border: "1px solid #e5e7eb",
            background: "white", fontWeight: 950, color: "#0f172a",
            fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
          }}
          title="Current time"
        >
          {(() => { void tick; return formatHMSS(new Date()); })()}
        </div>
      </div>

      <div style={{ display: "inline-flex", gap: 8, alignItems: "center", flex: "0 0 auto" }}>
        {[Views.DAY, Views.WEEK, Views.WORK_WEEK, Views.MONTH].map((v) => (
          <button key={v} type="button" style={btn(view === v)} onClick={() => onView(v)}>
            {{ [Views.DAY]: "Day", [Views.WEEK]: "Week", [Views.WORK_WEEK]: "Work week", [Views.MONTH]: "Month" }[v]}
          </button>
        ))}
      </div>

      {open ? (
        <div
          ref={popoverRef}
          style={{
            position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
            marginTop: 10, zIndex: 50, width: 320, background: "white",
            border: "1px solid #e5e7eb", borderRadius: 14,
            boxShadow: "0 16px 40px rgba(15,23,42,0.14)", overflow: "hidden",
          }}
        >
          <div style={{ padding: 12, display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 950, color: "#0f172a" }}>Go to date</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="date" value={picker} onChange={(e) => setPicker(e.target.value)}
                style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: 12, padding: "8px 10px", fontWeight: 800, color: "#0f172a", background: "white" }}
              />
              <button
                type="button" onClick={applyPicker}
                style={{ border: "1px solid #0f172a", borderRadius: 12, padding: "8px 12px", fontWeight: 950, background: "#0f172a", color: "white", cursor: "pointer" }}
              >
                Go
              </button>
            </div>
            <div style={{ height: 1, background: "#f1f5f9" }} />
            <button
              type="button" onClick={() => setOpen(false)}
              style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "8px 12px", fontWeight: 900, background: "white", color: "#0f172a", cursor: "pointer", textAlign: "left" }}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------- Event renderer
function EventCell({ event, title, onHover, onLeave }) {
  const type = event?.resource?.type;
  const kind = event?.resource?.kind;

  let Icon = null;
  if (type === "certificate") Icon = ICONS.cert;
  else if (type === "note") Icon = ICONS.note;
  else if (type === "task" && kind === "reminder") Icon = ICONS.taskReminder;
  else if (type === "task" && kind === "due") Icon = ICONS.taskDue;

  return (
    <div
      onMouseEnter={(e) => onHover?.(e, event)}
      onMouseLeave={onLeave}
      style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
      title={title}
    >
      {Icon ? <Icon size={14} style={{ flex: "0 0 auto" }} /> : null}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{title}</span>
    </div>
  );
}

export default function DashboardCalendar({ certificates = [], tasks = [], user }) {
  const navigate = useNavigate();

  const [view, setView] = React.useState(() => {
    const p = loadCalendarPrefs();
    return p?.view ?? Views.WEEK;
  });

  const [date, setDate] = React.useState(() => new Date());

  const [filters, setFilters] = React.useState(() => {
    const p = loadCalendarPrefs();
    if (!p?.filters) return DEFAULT_FILTERS;
    return { ...DEFAULT_FILTERS, ...p.filters };
  });

  React.useEffect(() => {
    saveCalendarPrefs({ view, filters });
  }, [view, filters]);

  function handleViewChange(newView) {
    setView(newView);
  }

  function handleFiltersChange(updater) {
    setFilters((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return next;
    });
  }

  const [hover, setHover] = React.useState(null);
  const hoverTimerRef = React.useRef(null);

  function hideTooltip() {
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    setHover(null);
  }

  React.useEffect(() => {
    if (!hover) return;
    function onMove(e) { if (!e.target?.closest?.(".rbc-event")) hideTooltip(); }
    function onScroll() { hideTooltip(); }
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [hover]);

  const [nowTick, setNowTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const [notesTick, setNotesTick] = React.useState(0);
  React.useEffect(() => {
    const bump = () => setNotesTick((x) => x + 1);
    const onStorage = (e) => { if (e.key === NOTES_KEY) bump(); };
    const onFocus = () => bump();
    const onVisibility = () => { if (document.visibilityState === "visible") bump(); };

    window.addEventListener("hsqe_notes_changed", bump);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("hsqe_notes_changed", bump);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const notes = React.useMemo(() => loadNotesSafe(), [notesTick]);

  const events = (() => {
    const out = [];

    if (filters.certsDue) {
      (Array.isArray(certificates) ? certificates : []).forEach((c) => {
        const d = safeDate(c.to_date);
        if (!d) return;
        const { start, end } = makeAllDayDate(d);
        out.push({
          id: `cert-${c.id}`,
          title: `${c.certificate_name || c.certificate_code || "Certificate"}`,
          start, end, allDay: true,
          resource: { type: "certificate", item: c },
          color: COLOR_CERT,
        });
      });
    }

    (Array.isArray(tasks) ? tasks : []).forEach((t) => {
      if ((t.status || "") === "Completed") return;
      const hasAssignees = asArray(t.assigned_to).length > 0;

      if (filters.tasksReminder) {
        const r = safeDate(t.reminder_at);
        if (r) {
          out.push({
            id: `task-remind-${t.id}`,
            title: `${t.title || "Task"}`,
            start: r, end: addMinutes(r, 30), allDay: false,
            resource: { type: "task", item: t, kind: "reminder", assigned: hasAssignees },
            color: COLOR_TASK,
          });
        }
      }

      if (filters.tasksDue) {
        const d = safeDate(t.due_date);
        if (d) {
          const { start, end } = makeAllDayDate(d);
          out.push({
            id: `task-due-${t.id}`,
            title: `${t.title || "Task"}`,
            start, end, allDay: true,
            resource: { type: "task", item: t, kind: "due", assigned: hasAssignees },
            color: COLOR_TASK_DUE,
          });
        }
      }
    });

    if (filters.notesReminder) {
      (Array.isArray(notes) ? notes : []).forEach((n) => {
        const r = safeDate(n?.reminder_at);
        if (!r) return;
        out.push({
          id: `note-remind-${n.id}`,
          title: `${n.title || "Note"}`,
          start: r, end: addMinutes(r, 30), allDay: false,
          resource: { type: "note", item: n, kind: "reminder" },
          color: COLOR_NOTE,
        });
      });
    }

    return out;
  })();

  // ✅ FIX: Ελέγχει αν υπάρχουν all-day events στην τρέχουσα εβδομάδα/μέρα που φαίνεται
  const hasAllDayEvents = React.useMemo(() => {
    if (view === Views.MONTH) return true; // στο month view το all-day row δεν υπάρχει, δεν επηρεάζεται
    const allDayEvts = events.filter((e) => e.allDay);
    if (!allDayEvts.length) return false;

    // Υπολόγισε το range που φαίνεται τώρα
    const base = date instanceof Date ? date : new Date();
    let rangeStart, rangeEnd;

    if (view === Views.DAY) {
      rangeStart = clampToDay(base);
      rangeEnd = new Date(rangeStart);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
    } else {
      // WEEK or WORK_WEEK
      rangeStart = startOfWeek(base, { locale: el });
      rangeEnd = new Date(rangeStart);
      rangeEnd.setDate(rangeEnd.getDate() + (view === Views.WORK_WEEK ? 5 : 7));
    }

    return allDayEvts.some((e) => e.start < rangeEnd && e.end > rangeStart);
  }, [events, view, date]);

  const scrollToTime = React.useMemo(() => { const t = new Date(); t.setHours(8, 0, 0, 0); return t; }, []);
  const min = React.useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);
  const max = React.useMemo(() => { const t = new Date(); t.setHours(23, 59, 59, 999); return t; }, []);

  const formats = React.useMemo(() => ({
    timeGutterFormat: "HH:mm:ss",
    eventTimeRangeFormat: ({ start }, culture, loc) => loc.format(start, "HH:mm", culture),
    eventTimeRangeStartFormat: ({ start }, culture, loc) => loc.format(start, "HH:mm", culture),
    eventTimeRangeEndFormat: ({ end }, culture, loc) => loc.format(end, "HH:mm", culture),
  }), []);

  function handleSelectEvent(event) {
    const type = event?.resource?.type;
    const item = event?.resource?.item;
    if (type === "certificate") return navigate(`/certificates?focus=${encodeURIComponent(item?.id ?? "")}&from=calendar`);
    if (type === "task") return navigate(`/tasks?focus=${encodeURIComponent(item?.id ?? "")}&from=calendar`);
    if (type === "note") return navigate(`/tasks?section=notes&focus=${encodeURIComponent(item?.id ?? "")}&from=calendar`);
  }

  function slotPropGetter(slotDate) {
    if (![Views.DAY, Views.WEEK, Views.WORK_WEEK].includes(view)) return {};
    const hour = new Date(slotDate).getHours();
    return { style: { background: hour >= 9 && hour < 18 ? "rgba(15, 23, 42, 0.08)" : "rgba(15, 23, 42, 0.02)" } };
  }

  function showTooltip(domEvent, event) {
    const rect = domEvent.currentTarget?.getBoundingClientRect?.();
    const x = (rect?.left ?? domEvent.clientX) + 12;
    const y = (rect?.top ?? domEvent.clientY) + 12;
    const type = event?.resource?.type;
    const item = event?.resource?.item;
    const kind = event?.resource?.kind;

    const lines = [];
    if (type === "certificate") {
      if (item?.vessel) lines.push(`Vessel: ${item.vessel}`);
      if (item?.certificate_code) lines.push(`Code: ${item.certificate_code}`);
      if (item?.status) lines.push(`Status: ${item.status}`);
      lines.push(`Date: ${format(clampToDay(event.start), "dd/MM/yyyy")}`);
    } else if (type === "task") {
      if (Array.isArray(item?.vessels) && item.vessels.length) lines.push(`Vessels: ${item.vessels.join(", ")}`);
      if (kind === "reminder") lines.push(`Reminder: ${format(new Date(event.start), "dd/MM/yyyy HH:mm")}`);
      else lines.push(`Due: ${format(clampToDay(event.start), "dd/MM/yyyy")}`);
      if (item?.status) lines.push(`Status: ${item.status}`);
      if (asArray(item?.assigned_to).length) lines.push(`Assigned: ${asArray(item.assigned_to).length} user(s)`);
    } else if (type === "note") {
      if (item?.vessel) lines.push(`Vessel: ${item.vessel}`);
      lines.push(`Reminder: ${format(new Date(event.start), "dd/MM/yyyy HH:mm")}`);
      if (item?.pinned) lines.push("Pinned: Yes");
    }

    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => hideTooltip(), 3000);
    setHover({ x, y, title: event.title, lines });
  }

  const filterItem = (checked, color) => ({
    display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 900,
    color: "#0f172a", cursor: "pointer", userSelect: "none", paddingBottom: 4,
    borderBottom: checked ? `3px solid ${color}` : "3px solid transparent",
  });

  return (
    <div style={{ display: "grid", gap: 2, position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", paddingTop: 2 }}>
          <label style={filterItem(filters.certsDue, COLOR_CERT)}>
            <input type="checkbox" checked={filters.certsDue}
              onChange={(e) => handleFiltersChange((p) => ({ ...p, certsDue: e.target.checked }))}
              style={{ margin: 0 }} />
            <ScrollText size={16} /> Certificates Due
          </label>

          <label style={filterItem(filters.tasksReminder, COLOR_TASK)}>
            <input type="checkbox" checked={filters.tasksReminder}
              onChange={(e) => handleFiltersChange((p) => ({ ...p, tasksReminder: e.target.checked }))}
              style={{ margin: 0 }} />
            <CheckCheck size={16} /> Task Reminders
          </label>

          <label style={filterItem(filters.tasksDue, COLOR_TASK_DUE)}>
            <input type="checkbox" checked={filters.tasksDue}
              onChange={(e) => handleFiltersChange((p) => ({ ...p, tasksDue: e.target.checked }))}
              style={{ margin: 0 }} />
            <BookX size={16} /> Tasks Due
          </label>

          <label style={filterItem(filters.notesReminder, COLOR_NOTE)}>
            <input type="checkbox" checked={filters.notesReminder}
              onChange={(e) => handleFiltersChange((p) => ({ ...p, notesReminder: e.target.checked }))}
              style={{ margin: 0 }} />
            <StickyNote size={16} /> Note Reminders
          </label>
        </div>
      </div>

      <div
        style={{ height: 640, borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb", background: "white" }}
        className={hasAllDayEvents ? "cal-has-allday" : "cal-no-allday"}
      >
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          date={date}
          onView={handleViewChange}
          onNavigate={setDate}
          onSelectEvent={handleSelectEvent}
          scrollToTime={scrollToTime}
          min={min}
          max={max}
          views={[Views.DAY, Views.WEEK, Views.WORK_WEEK, Views.MONTH]}
          formats={formats}
          slotPropGetter={slotPropGetter}
          getNow={() => { void nowTick; return new Date(); }}
          popup
          allDayMaxRows={2}
          messages={{ showMore: (total) => `+${total} more` }}
          showMultiDayTimes
          components={{
            toolbar: Toolbar,
            event: (props) => <EventCell {...props} onHover={showTooltip} onLeave={hideTooltip} />,
          }}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: event.color || "#3b82f6",
              borderColor: event.color || "#3b82f6",
              cursor: "pointer", borderRadius: 10,
              paddingLeft: 8, paddingRight: 8, fontWeight: 400,
              color: event.color === COLOR_NOTE ? "#0f172a" : "white",
            },
          })}
        />
      </div>

      {hover ? (
        <div style={{
          position: "fixed", left: hover.x, top: hover.y, zIndex: 9999,
          width: 280, background: "white", border: "1px solid #e5e7eb",
          borderRadius: 12, boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
          padding: 12, pointerEvents: "none",
        }}>
          <div style={{ fontWeight: 950, color: "#0f172a", marginBottom: 6, overflowWrap: "anywhere" }}>{hover.title}</div>
          <div style={{ display: "grid", gap: 4 }}>
            {hover.lines.map((l, idx) => (
              <div key={idx} style={{ fontSize: 12, color: "#475569", fontWeight: 800, overflowWrap: "anywhere" }}>{l}</div>
            ))}
          </div>
        </div>
      ) : null}

      <style>{`
        .rbc-time-content, .rbc-time-header-content { border-left: 1px solid #e5e7eb; }
        .rbc-time-content > * + * > * { border-left: 1px solid #eef2f7; }
        .rbc-timeslot-group { border-bottom: 1px solid #eef2f7; }
        .rbc-time-slot { border-top: 1px solid rgba(15,23,42,0.05); }
        .rbc-current-time-indicator { background-color: #ef4444; height: 2px; }
        .rbc-month-view .rbc-today { background-color: rgba(59, 130, 246, 0.14); }
        .rbc-time-view .rbc-today { background-color: rgba(59, 130, 246, 0.12); }
        .rbc-allday-cell { background: rgba(15, 23, 42, 0.02); }
        .rbc-event:focus { outline: none; }
        .rbc-header { font-weight: 900; font-size: 12px; color: #334155; }
        .rbc-toolbar-label { font-size: 13px; }
        .rbc-time-gutter .rbc-label { font-weight: 900; color: #0f172a; font-variant-numeric: tabular-nums; }

        /* ✅ FIX 1: Όταν υπάρχει 1 event — αφαίρεσε το κενό κάτω */
        .cal-has-allday .rbc-allday-cell { height: auto !important; min-height: 0 !important; }
        .cal-has-allday .rbc-row-content { height: auto !important; }
        .cal-has-allday .rbc-time-view .rbc-row { min-height: 0 !important; }

        /* ✅ FIX 2: Όταν δεν υπάρχουν all-day events — κρύψε ολόκληρο το all-day row */
        .cal-no-allday .rbc-time-header { display: none !important; }
      `}</style>
    </div>
  );
}
