// src/pages/Certificates.jsx
import React from "react";
import { createPortal } from "react-dom";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Download, Plus, Filter, Pencil, Trash2, ChevronDown, X } from "lucide-react";
import jsPDF from "jspdf";

import {
  listCertificates,
  listCertificatesPage,
  listCertificatesAll,
  createCertificate,
  updateCertificate,
  deleteCertificate,
  getSettings,
} from "../api";
import { useDraft } from "../state/drafts";
import CertificateForm from "../components/CertificateForm.jsx";
import { useSessionView } from "../state/sessionView.jsx";
import InfiniteScrollSentinel from "../components/InfiniteScrollSentinel.jsx";

// --------------------
// Helpers
// --------------------
function formatDMY(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function safeDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

// ✅ status computed from to_date (no reliance on c.status stored)
// RULES:
// > 4 months  => ok
// <= 4 months and >= today => due
// < today => overdue
function computeCertStatus(c, dueWindowDays = 120) {
  const to = safeDate(c?.to_date);
  if (!to) return "valid"; // unknown / not set

  const today = startOfToday();
  const diffDays = Math.ceil((to.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays <= dueWindowDays) return "due";
  return "ok";
}

function StatusBadge({ status }) {
  const s = (status || "").toLowerCase();
  const map = {
    ok: { bg: "#dcfce7", fg: "#166534", label: "Ok" },
    due: { bg: "#ffedd5", fg: "#9a3412", label: "Due" },
    overdue: { bg: "#fee2e2", fg: "#991b1b", label: "Overdue" },
    valid: { bg: "#e2e8f0", fg: "#0f172a", label: "Valid" },
  };
  const chosen = map[s] || { bg: "#e2e8f0", fg: "#0f172a", label: status || "—" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        background: chosen.bg,
        color: chosen.fg,
        fontWeight: 800,
        fontSize: 12,
        border: "1px solid rgba(0,0,0,0.06)",
        whiteSpace: "nowrap",
      }}
    >
      {chosen.label}
    </span>
  );
}

function ProgressBlocks({ to_date }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function parseDate(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const to = parseDate(to_date);

  if (!to) {
    return (
      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} style={{ width: 22, height: 22, borderRadius: 5, background: "#cbd5e1" }} />
        ))}
      </div>
    );
  }

  const diffDays = Math.ceil((to.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let greenBars = 0;
  if (diffDays >= 120) greenBars = 4;
  else if (diffDays >= 90) greenBars = 3;
  else if (diffDays >= 60) greenBars = 2;
  else if (diffDays >= 30) greenBars = 1;
  else greenBars = 0;

  const colors = Array.from({ length: 4 }).map((_, idx) => (idx < greenBars ? "#22c55e" : "#d00000"));

  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      {colors.map((c, idx) => (
        <div key={idx} style={{ width: 22, height: 22, borderRadius: 5, background: c }} />
      ))}
    </div>
  );
}

// --------------------
// PDF Export (A4, pagination, width-warning)
// --------------------
function pad2(n) {
  return String(n).padStart(2, "0");
}
function formatDDMMYYYY(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}
function nowStamp() {
  const dt = new Date();
  const dd = pad2(dt.getDate());
  const mm = pad2(dt.getMonth() + 1);
  const yyyy = dt.getFullYear();
  const hh = pad2(dt.getHours());
  const mi = pad2(dt.getMinutes());
  const ss = pad2(dt.getSeconds());
  return {
    date: `${dd}-${mm}-${yyyy}`,
    dateTime: `${dd}-${mm}-${yyyy} ${hh}:${mi}:${ss}`,
  };
}
function hasActiveFilters({ search, vesselsSelected, typesSelected, status }) {
  return (
    (search || "").trim() !== "" ||
    (Array.isArray(vesselsSelected) && vesselsSelected.length > 0) ||
    (Array.isArray(typesSelected) && typesSelected.length > 0) ||
    (status || "all") !== "all"
  );
}

function computeProgressGreenBars(to_date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!to_date) return null;

  const d = new Date(to_date);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let greenBars = 0;
  if (diffDays > 120) greenBars = 4;
  else if (diffDays > 90) greenBars = 3;
  else if (diffDays > 60) greenBars = 2;
  else if (diffDays > 30) greenBars = 1;
  else greenBars = 0;

  return greenBars;
}

function exportCertificatesPdf({ rows, titleLines }) {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  // A4 in mm
  const pageW = 210;
  const pageH = 297;

  // tight professional margins
  const mL = 6;
  const mR = 6;
  const mT = 7;
  const mB = 7;

  const usableW = pageW - mL - mR;

  // Layout sizes
  const headerH = 16;
  const footerH = 8;
  const tableHeaderH = 8;

  const yTopTable = mT + headerH;
  const yBottomLimit = pageH - mB - footerH;

  // Column widths MUST sum to usableW (198)
  const col = {
    vessel: 22,
    cert: 22,
    details: 64,
    from: 18,
    to: 18,
    progress: 28,
    status: 26,
  };

  const cols = [
    { key: "vessel", label: "Vessel", w: col.vessel, align: "left" },
    { key: "cert", label: "Certificate", w: col.cert, align: "left" },
    { key: "details", label: "Details", w: col.details, align: "left" },
    { key: "from", label: "From", w: col.from, align: "center" },
    { key: "to", label: "To", w: col.to, align: "center" },
    { key: "progress", label: "Progress (4 months)", w: col.progress, align: "center" },
    { key: "status", label: "Status", w: col.status, align: "center" },
  ];

  // ✅ WIDTH WARNING
  const tableWidth = cols.reduce((s, c) => s + (Number(c.w) || 0), 0);
  if (tableWidth > usableW + 0.001) {
    window.alert(
      `⚠️ PDF Warning\n\nThe table is too wide for A4.\nTable width: ${tableWidth.toFixed(
        1
      )}mm\nAvailable width: ${usableW.toFixed(1)}mm\n\nResult may look compressed or overflow.\n(We can fix by adjusting column widths.)`
    );
  }

  const lineH = 4.2;
  const cellPadX = 2;
  const cellPadY = 2;

  const stamp = nowStamp();

  function drawHeader() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(titleLines[0], pageW / 2, mT + 6, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(titleLines[1], pageW / 2, mT + 12, { align: "center" });

    doc.setDrawColor(229, 231, 235);
    doc.line(mL, mT + headerH - 2, pageW - mR, mT + headerH - 2);
  }

  function drawFooter(pageIndex, totalPages) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);

    doc.text(`Generated: ${stamp.dateTime}`, mL, pageH - mB - 2);
    doc.text(`Page ${pageIndex} of ${totalPages}`, pageW - mR, pageH - mB - 2, { align: "right" });

    doc.setTextColor(15, 23, 42);
  }

  function drawTableHeader(y) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(229, 231, 235);
    doc.rect(mL, y, usableW, tableHeaderH, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);

    let x = mL;
    for (const c of cols) {
      const tx =
        c.align === "center" ? x + c.w / 2 : c.align === "right" ? x + c.w - cellPadX : x + cellPadX;

      doc.text(c.label, tx, y + 5.4, { align: c.align });
      x += c.w;
    }

    doc.setTextColor(15, 23, 42);
  }

  function measureRowHeight(row) {
    doc.setFontSize(9.5);

    const name = row.certificate_name || "—";
    const type = row.type || "";

    const nameLines = doc.splitTextToSize(name, col.details - cellPadX * 2);
    const typeLines = type ? doc.splitTextToSize(type, col.details - cellPadX * 2) : [];
    const typeLineCount = typeLines.length ? 1 : 0;

    const detailsLines = nameLines.length + typeLineCount;
    const detailsH = cellPadY * 2 + detailsLines * lineH;

    const fixedH = 12;
    return Math.max(detailsH, fixedH);
  }

  function drawProgress(x, y, w, h, to_date) {
    const greenBars = computeProgressGreenBars(to_date);

    const blockSize = 4.6;
    const gap = 1.2;
    const totalW = blockSize * 4 + gap * 3;
    const startX = x + (w - totalW) / 2;
    const startY = y + (h - blockSize) / 2;

    for (let i = 0; i < 4; i++) {
      let color;
      if (greenBars === null) color = [203, 213, 225];
      else color = i < greenBars ? [34, 197, 94] : [208, 0, 0];

      doc.setFillColor(color[0], color[1], color[2]);
      doc.setDrawColor(255, 255, 255);
      doc.roundedRect(
        startX + i * (blockSize + gap),
        startY,
        blockSize,
        blockSize,
        1.1,
        1.1,
        "F"
      );
    }
  }

  function drawStatusBadge(x, y, w, h, status) {
    const s = (status || "").toLowerCase();
    const map = {
      ok: { bg: [220, 252, 231], fg: [22, 101, 52], label: "Ok" },
      due: { bg: [255, 237, 213], fg: [154, 52, 18], label: "Due" },
      overdue: { bg: [254, 226, 226], fg: [153, 27, 27], label: "Overdue" },
      valid: { bg: [226, 232, 240], fg: [15, 23, 42], label: "Valid" },
    };
    const chosen =
      map[s] || { bg: [226, 232, 240], fg: [15, 23, 42], label: status || "—" };

    const badgeH = 6.6;
    const badgeW = Math.min(w - 4, 18 + doc.getTextWidth(chosen.label));
    const bx = x + (w - badgeW) / 2;
    const by = y + (h - badgeH) / 2;

    doc.setFillColor(...chosen.bg);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(bx, by, badgeW, badgeH, 3.2, 3.2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...chosen.fg);
    doc.text(chosen.label, bx + badgeW / 2, by + 4.7, { align: "center" });

    doc.setTextColor(15, 23, 42);
  }

  function simulatePages() {
    let pages = 1;
    let y = yTopTable + tableHeaderH;

    for (const r of rows) {
      const rh = measureRowHeight(r);
      if (y + rh > yBottomLimit) {
        pages += 1;
        y = yTopTable + tableHeaderH;
      }
      y += rh;
    }
    return pages;
  }

  const totalPages = simulatePages();

  let page = 1;
  drawHeader();
  drawTableHeader(yTopTable);

  let y = yTopTable + tableHeaderH;
  doc.setDrawColor(229, 231, 235);

  for (const r of rows) {
    const rh = measureRowHeight(r);

    if (y + rh > yBottomLimit) {
      drawFooter(page, totalPages);
      doc.addPage();
      page += 1;
      drawHeader();
      drawTableHeader(yTopTable);
      y = yTopTable + tableHeaderH;
    }

    doc.setFillColor(255, 255, 255);
    doc.rect(mL, y, usableW, rh, "F");
    doc.line(mL, y + rh, mL + usableW, y + rh);

    let x = mL;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(r.vessel || "—", x + cellPadX, y + 6, { align: "left" });
    x += col.vessel;

    doc.setFont("helvetica", "bold");
    doc.text(r.certificate_code || "—", x + cellPadX, y + 6, { align: "left" });
    x += col.cert;

    doc.setFont("helvetica", "bold");
    const name = r.certificate_name || "—";
    const nameLines = doc.splitTextToSize(name, col.details - cellPadX * 2);
    const maxNameLines = Math.max(1, Math.min(3, nameLines.length));
    for (let i = 0; i < maxNameLines; i++) {
      doc.text(nameLines[i], x + cellPadX, y + 6 + i * lineH);
    }

    const typeText = r.type || "";
    if (typeText) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(typeText, x + cellPadX, y + 6 + maxNameLines * lineH);
      doc.setTextColor(15, 23, 42);
    }
    x += col.details;

    doc.setFont("helvetica", "normal");
    doc.text(formatDDMMYYYY(r.from_date), x + col.from / 2, y + 6, { align: "center" });
    x += col.from;

    doc.text(formatDDMMYYYY(r.to_date), x + col.to / 2, y + 6, { align: "center" });
    x += col.to;

    drawProgress(x, y, col.progress, rh, r.to_date);
    x += col.progress;

    const st = computeCertStatus(r, 120);
    drawStatusBadge(x, y, col.status, rh, st);

    y += rh;
  }

  drawFooter(page, totalPages);

  const fileName = `HSQE Assistant - Certificates & Surveys Report - ${stamp.date}.pdf`;
  doc.save(fileName);

  return { totalPages };
}

// --------------------
// Modal (scroll + boxSizing + X button)
// --------------------
function Modal({ title, children, onClose, headerRight = null }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 50,
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          width: "min(860px, 100%)",
          background: "white",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          boxSizing: "border-box",
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
            background: "white",
            flex: "0 0 auto",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900 }}>{title}</div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {headerRight}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "white",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
            aria-label="Close"
            title="Close"
          >
            <X size={18} />
            </button>
          </div>
        </div>

        <div
          style={{
            padding: 16,
            overflow: "auto",
            boxSizing: "border-box",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// --------------------
// Context menu (portal)  ✅ FIX: dynamic height + safe positioning + uses real items length
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

  const w = 190;

  // ✅ instead of fixed h=96, compute it from items
  const rowH = 44; // button height-ish
  const divH = 1; // separator height
  const padding = 0;
  const h = items.length * rowH + (items.length - 1) * divH + padding;

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
              fontWeight: 700,
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
// MultiSelect
// --------------------
function MultiSelect({ placeholder, options, value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);

  React.useEffect(() => {
    function onDoc(e) {
      if (!wrapRef.current) return;
      if (wrapRef.current.contains(e.target)) return;
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

  const count = Array.isArray(value) ? value.length : 0;
  const label = count > 0 ? `${count} selected` : placeholder;

  function toggle(v) {
    const cur = Array.isArray(value) ? value : [];
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    onChange(next);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%",
          height: 42,
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          background: "white",
          padding: "0 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          gap: 10,
        }}
      >
        <span style={{ color: count ? "#0f172a" : "#64748b", fontWeight: 700 }}>{label}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {count ? (
            <span
              title="Clear"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
                setOpen(false);
              }}
              style={{
                display: "inline-flex",
                width: 26,
                height: 26,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #e5e7eb",
                background: "white",
              }}
            >
              <X size={14} />
            </span>
          ) : null}
          <ChevronDown size={18} />
        </span>
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            top: 46,
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 14px 40px rgba(0,0,0,0.12)",
            overflow: "hidden",
            zIndex: 20,
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {options.map((opt) => {
            const checked = (value || []).includes(opt);
            return (
              <label
                key={opt}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <input type="checkbox" checked={checked} onChange={() => toggle(opt)} />
                <span style={{ fontWeight: 700, color: "#0f172a" }}>{opt}</span>
              </label>
            );
          })}
          {options.length === 0 ? <div style={{ padding: 12, color: "#64748b" }}>No options</div> : null}
        </div>
      ) : null}
    </div>
  );
}

// --------------------
// Table
// --------------------
function TableHeader({ sortKey, sortDir, onSort }) {
  const th = {
    textAlign: "left",
    fontSize: 12,
    color: "#334155",
    fontWeight: 800,
    padding: "12px 14px",
    borderBottom: "1px solid #e5e7eb",
    background: "#f8fafc",
    position: "sticky",
    top: 0,
    zIndex: 1,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  };
  return (
    <thead>
      <tr>
        <th style={th} onClick={() => onSort("vessel")} title="Sort">
          Vessel{sortKey === "vessel" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
        </th>

        <th style={th} onClick={() => onSort("certificate_code")} title="Sort">
          Certificate{sortKey === "certificate_code" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
        </th>

        <th style={th} onClick={() => onSort("certificate_name")} title="Sort">
          Details{sortKey === "certificate_name" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
        </th>

        <th style={{ ...th, textAlign: "center" }} onClick={() => onSort("from_date")} title="Sort">
          From{sortKey === "from_date" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
        </th>

        <th style={{ ...th, textAlign: "center" }} onClick={() => onSort("to_date")} title="Sort">
          To{sortKey === "to_date" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
        </th>

        <th style={{ ...th, textAlign: "center", cursor: "default" }} title="Progress (not sortable)">
          Progress (4 months)
        </th>

        <th style={{ ...th, textAlign: "center" }} onClick={() => onSort("status")} title="Sort">
          Status{sortKey === "status" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
        </th>
      </tr>
    </thead>
  );

}

function TableRow({ c, onOpenMenu, isFlash, rowRef }) {
  const td = {
    padding: "14px",
    borderBottom: "1px solid #e5e7eb",
    verticalAlign: "top",
    fontSize: 14,
  };

  const pressTimer = React.useRef(null);
  const startXY = React.useRef({ x: 0, y: 0 });
  const moved = React.useRef(false);

  function clearPress() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  function onPointerDown(e) {
    if (e.pointerType === "mouse") return;

    moved.current = false;
    startXY.current = { x: e.clientX, y: e.clientY };

    clearPress();
    pressTimer.current = setTimeout(() => {
      if (!moved.current) onOpenMenu({ x: e.clientX, y: e.clientY }, c);
    }, 520);
  }

  function onPointerMove(e) {
    if (!pressTimer.current) return;
    const dx = Math.abs(e.clientX - startXY.current.x);
    const dy = Math.abs(e.clientY - startXY.current.y);
    if (dx > 8 || dy > 8) moved.current = true;
  }

  function onPointerUp() {
    clearPress();
  }

  function onPointerCancel() {
    clearPress();
  }

  const computedStatus = computeCertStatus(c, 120);

  return (
    <tr
      ref={rowRef}
      style={{
        cursor: "context-menu",
        background: isFlash ? "rgba(59,130,246,0.09)" : "white",
        outline: isFlash ? "2px solid rgba(59,130,246,0.85)" : "none",
        boxShadow: isFlash ? "0 10px 30px rgba(59,130,246,0.12)" : "none",
        transition: "background 180ms ease, outline 180ms ease, box-shadow 180ms ease",
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenMenu({ x: e.clientX, y: e.clientY }, c);
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onMouseEnter={(e) => {
        if (!isFlash) e.currentTarget.style.background = "#f8fafc";
      }}
      onMouseLeave={(e) => {
        if (!isFlash) e.currentTarget.style.background = "white";
      }}
    >
      <td style={{ ...td, fontWeight: 800 }}>{c.vessel || "—"}</td>
      <td style={{ ...td, fontWeight: 900 }}>{c.certificate_code || "—"}</td>
      <td style={td}>
        <div style={{ fontWeight: 700 }}>{c.certificate_name || "—"}</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>{c.type || ""}</div>
      </td>
      <td style={{ ...td, textAlign: "center" }}>{formatDMY(c.from_date)}</td>
      <td style={{ ...td, textAlign: "center" }}>{formatDMY(c.to_date)}</td>
      <td style={{ ...td, textAlign: "center" }}>
        <ProgressBlocks to_date={c.to_date} />
      </td>
      <td style={{ ...td, textAlign: "center" }}>
        <StatusBadge status={computedStatus} />
      </td>
    </tr>
  );
}

// --------------------
// Page
// --------------------
export default function Certificates() {
  const qc = useQueryClient();

  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const [flashId, setFlashId] = React.useState(null);
  const rowRefs = React.useRef({});

  React.useEffect(() => {
    if (!focusId) return;

    const id = String(focusId);
    setFlashId(id);

    const raf = requestAnimationFrame(() => {
      const el = rowRefs.current[id];
      if (el?.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    const t = setTimeout(() => setFlashId(null), 2500);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [focusId]);

  const [showNew, setShowNew] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [confirmDelete, setConfirmDelete] = React.useState(null);
  const [ctx, setCtx] = React.useState(null);

  // Drafts: keep "New Certificate" data across navigation.
  const {
    draft: certDraft,
    setDraft: setCertDraft,
    clearDraft: clearCertDraft,
  } = useDraft("certificates-new");
  React.useEffect(() => {
    if (certDraft) setShowNew(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ✅ Sorting (default A→Z)
  const [sortKey, setSortKey] = React.useState("vessel");
  const [sortDir, setSortDir] = React.useState("asc");

  // ✅ Persist filters in-session (navigate away/back keeps last state)
  const { value: view, patch: patchView } = useSessionView("certificates", {
    search: "",
    vesselsSelected: [],
    typesSelected: [],
    status: "all",
  });

  const search = view.search ?? "";
  const vesselsSelected = Array.isArray(view.vesselsSelected) ? view.vesselsSelected : [];
  const typesSelected = Array.isArray(view.typesSelected) ? view.typesSelected : [];
  const status = view.status ?? "all";

  // ----- Incremental loading (cursor-paginated, 30 per page) -----
  // Server-side filter+sort args. Anything in this object becomes part of the
  // query key, so changing a filter automatically resets pagination.
  const pageFilters = React.useMemo(
    () => ({ search, vesselsSelected, typesSelected, status }),
    [search, vesselsSelected, typesSelected, status]
  );
  const pageSort = React.useMemo(
    () => ({ key: sortKey, dir: sortDir }),
    [sortKey, sortDir]
  );

  const PAGE_SIZE = 30;

  // Used by InfiniteScrollSentinel as the IntersectionObserver root.
  const scrollContainerRef = React.useRef(null);
  // Bumped after first paint so the sentinel re-binds with the real DOM node
  // (refs don't trigger re-renders by themselves).
  const [, forceSentinelBind] = React.useState(0);
  React.useEffect(() => {
    forceSentinelBind((x) => x + 1);
  }, []);

  const {
    data: certPagesData,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["certificates-page", pageFilters, pageSort, PAGE_SIZE],
    queryFn: ({ pageParam = null }) =>
      listCertificatesPage({
        cursor: pageParam,
        limit: PAGE_SIZE,
        filters: pageFilters,
        sort: pageSort,
      }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? null,
    staleTime: 30_000,
  });

  // Flattened list of rows fetched so far.
  const certificates = React.useMemo(() => {
    const pages = certPagesData?.pages || [];
    return pages.flatMap((p) => p?.items || []);
  }, [certPagesData]);

  const totalCount = certPagesData?.pages?.[0]?.total ?? certificates.length;

  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const vesselsOptions = settingsData?.vessels || [];
  const certTypeOptions = settingsData?.certificateTypes || [];

  const createMut = useMutation({
    mutationFn: createCertificate,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["certificates"] });
      await qc.invalidateQueries({ queryKey: ["certificates-page"] });
      clearCertDraft();
      setShowNew(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, input }) => updateCertificate(id, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["certificates"] });
      await qc.invalidateQueries({ queryKey: ["certificates-page"] });
      setEditing(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteCertificate(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["certificates"] });
      await qc.invalidateQueries({ queryKey: ["certificates-page"] });
      setConfirmDelete(null);
    },
  });
   
    function toggleSort(nextKey) {
      if (sortKey !== nextKey) {
        setSortKey(nextKey);
        setSortDir("asc");
        return;
      }
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }


  // Server already applies filter + sort. We only re-expose the loaded rows
  // under the original `filtered` name so the rest of the JSX keeps working.
  const filtered = certificates;

  function openMenu(pos, cert) {
    setCtx({ x: pos.x, y: pos.y, cert });
  }

  async function onExportPdf() {
    const filtersActive = hasActiveFilters({ search, vesselsSelected, typesSelected, status });

    // The list is loaded incrementally, so the export must explicitly fetch
    // the full result set from the server (filtered or not).
    let rowsToExport;

    if (filtersActive) {
      const okFiltered = window.confirm(
        "Export PDF\n\nOK: Only filtered results\nCancel: All certificates"
      );
      if (okFiltered) {
        rowsToExport = await listCertificatesAll({ filters: pageFilters, sort: pageSort });
      } else {
        rowsToExport = await listCertificatesAll({ filters: {}, sort: pageSort });
      }
    } else {
      rowsToExport = await listCertificatesAll({ filters: {}, sort: pageSort });
    }

    exportCertificatesPdf({
      rows: rowsToExport,
      titleLines: ["HSQE Assistant", "Certificates & Surveys Report"],
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 980, color: "#0f172a" }}>Certificates & Surveys</div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onExportPdf}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "white",
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <Download size={18} /> Export PDF
          </button>

          <button
            onClick={() => setShowNew(true)}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #0f172a",
              background: "#0f172a",
              color: "white",
              fontWeight: 900,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <Plus size={18} /> New Certificate
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "white", padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 900 }}>
            <Filter size={18} /> Filters
          </div>

          <button
            type="button"
            style={{ border: "none", background: "transparent", color: "#0f172a", fontWeight: 800, cursor: "pointer" }}
            onClick={() => {
              patchView({ search: "", vesselsSelected: [], typesSelected: [], status: "all" });
            }}
          >
            Clear All
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          <input
            placeholder="Search..."
            value={search}
            onChange={(e) => patchView({ search: e.target.value })}
            style={{
              height: 42,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              padding: "0 12px",
              outline: "none",
              background: "white",
              boxSizing: "border-box",
            }}
          />

          <MultiSelect
            placeholder="Vessels"
            options={vesselsOptions}
            value={vesselsSelected}
            onChange={(next) => patchView({ vesselsSelected: next })}
          />

          <MultiSelect
            placeholder="Types"
            options={certTypeOptions}
            value={typesSelected}
            onChange={(next) => patchView({ typesSelected: next })}
          />

          <select
            value={status}
            onChange={(e) => patchView({ status: e.target.value })}
            style={{ padding: "0 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "white", height: 42 }}
          >
            <option value="all">All</option>
            <option value="ok">Ok</option>
            <option value="due">Due</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", background: "white" }}>
        <div ref={scrollContainerRef} style={{ maxHeight: "62vh", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <TableHeader
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
            />
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 16, color: "#64748b" }}>
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 16, color: "#64748b" }}>
                    No certificates found.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const idStr = String(c.id);
                  return (
                    <TableRow
                      key={c.id}
                      c={c}
                      onOpenMenu={openMenu}
                      isFlash={flashId === idStr}
                      rowRef={(node) => {
                        if (node) rowRefs.current[idStr] = node;
                      }}
                    />
                  );
                })
              )}
            </tbody>
          </table>

          {/* Incremental loading: triggers next page when scrolled near bottom */}
          {!isLoading && filtered.length > 0 ? (
            <>
              <InfiniteScrollSentinel
                root={scrollContainerRef.current}
                enabled={!!hasNextPage && !isFetchingNextPage}
                onIntersect={() => fetchNextPage()}
              />
              <div
                style={{
                  padding: "10px 16px",
                  textAlign: "center",
                  color: "#64748b",
                  fontSize: 12,
                }}
              >
                {isFetchingNextPage
                  ? "Loading more…"
                  : hasNextPage
                  ? `Scroll to load more (${filtered.length} of ${totalCount})`
                  : `All ${totalCount} loaded`}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Portal Context Menu */}
      {ctx ? (
        <ContextMenu
          pos={{ x: ctx.x, y: ctx.y }}
          onClose={() => setCtx(null)}
          items={[
            { label: "Edit", icon: <Pencil size={16} />, onClick: () => setEditing(ctx.cert) },
            { label: "Delete", icon: <Trash2 size={16} />, danger: true, onClick: () => setConfirmDelete(ctx.cert) },
          ]}
        />
      ) : null}

      {/* New */}
      {showNew ? (
        <Modal
          title="New Certificate"
          onClose={() => setShowNew(false)}
          headerRight={
            certDraft ? (
              <button
                type="button"
                onClick={() => {
                  clearCertDraft();
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
          <CertificateForm
            initial={certDraft || {}}
            saving={createMut.isPending}
            onCancel={() => setShowNew(false)}
            onSave={(data) => createMut.mutate(data)}
            onDraftChange={(data) => setCertDraft(data)}
          />
        </Modal>
      ) : null}

      {/* Edit */}
      {editing ? (
        <Modal title="Edit Certificate" onClose={() => setEditing(null)}>
          <CertificateForm
            initial={editing}
            saving={updateMut.isPending}
            onCancel={() => setEditing(null)}
            onSave={(data) => updateMut.mutate({ id: editing.id, input: data })}
          />
        </Modal>
      ) : null}

      {/* Delete confirm */}
      {confirmDelete ? (
        <Modal title="Delete" onClose={() => setConfirmDelete(null)}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ color: "#0f172a", fontWeight: 800 }}>Are you sure you want to delete this certificate?</div>
            <div style={{ color: "#64748b", fontSize: 13 }}>
              {confirmDelete.vessel || "—"} • {confirmDelete.certificate_code || "—"} •{" "}
              {confirmDelete.certificate_name || "—"}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
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
                type="button"
                disabled={deleteMut.isPending}
                onClick={() => deleteMut.mutate(confirmDelete.id)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #7f1d1d",
                  background: "#b91c1c",
                  color: "white",
                  fontWeight: 900,
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
    </div>
  );
}
