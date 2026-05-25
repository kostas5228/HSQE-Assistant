// src/utils/pdf/exports.js
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// --------------------
// Date helpers (DD-MM-YYYY)
// --------------------
function pad2(n) {
  return String(n).padStart(2, "0");
}

export function formatDateDDMMYYYY(value) {
  if (!value) return "—";
  const s = String(value).trim();

  // YYYY-MM-DD => DD-MM-YYYY
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
  }
  return s;
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

// --------------------
// Export selection logic
// --------------------
export function pickRowsForExport({
  hasActiveFilters,
  allRows,
  filteredRows,
  confirmText,
}) {
  if (!hasActiveFilters) return allRows;
  const ok = window.confirm(
    confirmText || "Export PDF\n\nOK: Only filtered results\nCancel: All records"
  );
  return ok ? filteredRows : allRows;
}

// --------------------
// ✅ NEW: Export a DOM section (charts/cards) as PDF
// - Captures the element as an image via html2canvas
// - Auto-paginates vertically (multi-page PDF)
// - A4 portrait/landscape
// --------------------
function getPageDimsMM(orientation) {
  // A4 sizes in mm
  // portrait: 210 x 297
  // landscape: 297 x 210
  if (orientation === "l") return { pageW: 297, pageH: 210 };
  return { pageW: 210, pageH: 297 };
}

/**
 * Export a DOM element as a PDF (screenshot-style)
 * @param {object} opts
 * @param {HTMLElement} opts.element - DOM node to capture
 * @param {string} opts.reportTitle
 * @param {string} opts.filenameTitle
 * @param {"p"|"l"} opts.orientation
 */
export async function exportDomSectionPdf({
  element,
  reportTitle = "Statistics Report",
  filenameTitle = "Statistics Report",
  orientation = "p",
}) {
  if (!element) {
    window.alert("Export failed: Statistics section not found in DOM.");
    return;
  }

  const stamp = nowStamp();

  // Margins
  const mL = 6;
  const mR = 6;
  const mT = 7;
  const mB = 7;

  const headerH = 16;
  const footerH = 8;

  const { pageW, pageH } = getPageDimsMM(orientation);
  const usableW = pageW - mL - mR;
  const usableH = pageH - mT - mB - headerH - footerH;

  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });

  function drawHeader() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("HSQE Assistant", pageW / 2, mT + 6, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(reportTitle, pageW / 2, mT + 12, { align: "center" });

    doc.setDrawColor(229, 231, 235);
    doc.line(mL, mT + headerH - 2, pageW - mR, mT + headerH - 2);
  }

  function drawFooter(pageIndex, totalPages) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);

    doc.text(`Generated: ${stamp.dateTime}`, mL, pageH - mB - 2);
    doc.text(`Page ${pageIndex} of ${totalPages}`, pageW - mR, pageH - mB - 2, {
      align: "right",
    });

    doc.setTextColor(15, 23, 42);
  }

  // ✅ Find "atomic" blocks (no-split)
  const blocks = Array.from(element.querySelectorAll("[data-pdf-block]"));

  // Fallback: if no blocks found, export whole element (old behavior)
  const targetBlocks = blocks.length > 0 ? blocks : [element];

  const scale = Math.max(3, (window.devicePixelRatio || 1) * 2);

  // Capture blocks to canvases first (so we know heights)
  const captures = [];
  for (const b of targetBlocks) {
    const canvas = await html2canvas(b, {
      scale,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: b.scrollWidth || b.clientWidth,
      windowHeight: b.scrollHeight || b.clientHeight,
    });

    const imgPxW = canvas.width;
    const imgPxH = canvas.height;

    // fit by width
    const mmPerPx = usableW / imgPxW;
    const imgMMW = usableW;
    const imgMMH = imgPxH * mmPerPx;

    captures.push({
      canvas,
      imgMMW,
      imgMMH,
    });
  }

  // Now paginate by "no-split blocks"
  let page = 1;
  let y = mT + headerH;

  drawHeader();

  function newPage() {
    doc.addPage();
    page += 1;
    drawHeader();
    y = mT + headerH;
  }

  for (const cap of captures) {
    // If block doesn't fit remaining space -> new page
    if (y + cap.imgMMH > mT + headerH + usableH) {
      newPage();
    }

    const dataUrl = cap.canvas.toDataURL("image/png", 1.0);
    doc.addImage(dataUrl, "PNG", mL, y, cap.imgMMW, cap.imgMMH);

    y += cap.imgMMH + 4; // small gap between blocks
  }

  const totalPages = doc.getNumberOfPages();

  // Draw footers on every page
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(p, totalPages);
  }

  const fileName = `HSQE Assistant - ${filenameTitle} - ${stamp.date}.pdf`;
  doc.save(fileName);
}

// Wrapper for your “Statistics UI export”
export async function exportStatisticsDashboardPdf({
  element,
  orientation = "p",
}) {
  return exportDomSectionPdf({
    element,
    reportTitle: "Statistics Report",
    filenameTitle: "Statistics Report",
    orientation,
  });
}

// --------------------
// PDF table engine (your existing one - unchanged)
// --------------------
function warnIfTooWideOnce(tableW, usableW) {
  if (tableW > usableW + 0.001) {
    window.alert(
      `⚠️ PDF Warning\n\nThe table is too wide for A4.\nTable width: ${tableW.toFixed(
        1
      )}mm\nAvailable width: ${usableW.toFixed(
        1
      )}mm\n\nConsider removing columns or adjusting widths.`
    );
  }
}

/**
 * If user selected all 3 long-text columns (description + corrective + preventive),
 * then export is considered "full report" -> no clamping.
 * Otherwise, clamp long-text fields to max 5 lines and add " …" at the end.
 */
function getMaxLinesForKey(key, columns) {
  const cols = Array.isArray(columns) ? columns : [];
  const hasAllThree =
    cols.includes("description") &&
    cols.includes("corrective_action") &&
    cols.includes("preventive_action");

  if (hasAllThree) return Infinity;

  const longTextKeys = [
    "description",
    "corrective_action",
    "preventive_action",
    "notes",
  ];

  if (longTextKeys.includes(key)) return 5;

  return Infinity;
}

function splitLines(doc, text, maxW, maxLines = Infinity) {
  const raw = (text ?? "").toString();
  const safe = raw.trim() ? raw : "—";

  const lines = doc.splitTextToSize(safe, Math.max(10, maxW));
  if (!Array.isArray(lines) || lines.length === 0) return ["—"];

  if (lines.length <= maxLines) return lines;

  const clipped = lines.slice(0, maxLines);
  clipped[maxLines - 1] = clipped[maxLines - 1].replace(/\s*$/, "") + " …";
  return clipped;
}

/**
 * orientation:
 * - "p"  => force portrait
 * - "l"  => force landscape
 * - "auto" => start portrait; if table doesn't fit width, switch to landscape; warn only if still too wide
 */
function exportTablePdfMM({
  reportTitle,
  filenameTitle,
  rows,
  columns,
  headerLabels,
  colWidthsMM,
  getCellText,
  orientation = "p",
}) {
  // margins (6–7mm)
  const mL = 6;
  const mR = 6;
  const mT = 7;
  const mB = 7;

  const headerH = 16;
  const footerH = 8;
  const tableHeaderH = 8;

  const stamp = nowStamp();

  const widths =
    Array.isArray(colWidthsMM) && colWidthsMM.length === columns.length
      ? colWidthsMM
      : null;

  function computeUsableWFor(ori) {
    const { pageW } = getPageDimsMM(ori);
    return pageW - mL - mR;
  }

  function getWidths(usableW) {
    if (widths) return widths;
    return new Array(columns.length).fill(
      usableW / Math.max(1, columns.length)
    );
  }

  let finalOri = orientation === "l" ? "l" : "p";

  if (orientation === "auto") {
    const usableWPortrait = computeUsableWFor("p");
    const wPortrait = getWidths(usableWPortrait);
    const tableW = wPortrait.reduce((s, w) => s + (Number(w) || 0), 0);

    if (tableW > usableWPortrait + 0.001) {
      finalOri = "l";
    } else {
      finalOri = "p";
    }
  }

  const doc = new jsPDF({ orientation: finalOri, unit: "mm", format: "a4" });

  const { pageW, pageH } = getPageDimsMM(finalOri);
  const usableW = pageW - mL - mR;

  const yTopTable = mT + headerH;
  const yBottomLimit = pageH - mB - footerH;

  const finalWidths = getWidths(usableW);
  const tableWidth = finalWidths.reduce((s, w) => s + (Number(w) || 0), 0);

  warnIfTooWideOnce(tableWidth, usableW);

  const fontSizeBody = 9.5;
  const fontSizeHead = 9.5;
  const lineH = 4.2;
  const cellPadX = 2;
  const cellPadY = 2;

  function drawHeader() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("HSQE Assistant", pageW / 2, mT + 6, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(reportTitle, pageW / 2, mT + 12, { align: "center" });

    doc.setDrawColor(229, 231, 235);
    doc.line(mL, mT + headerH - 2, pageW - mR, mT + headerH - 2);
  }

  function drawFooter(pageIndex, totalPages) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);

    doc.text(`Generated: ${stamp.dateTime}`, mL, pageH - mB - 2);
    doc.text(`Page ${pageIndex} of ${totalPages}`, pageW - mR, pageH - mB - 2, {
      align: "right",
    });

    doc.setTextColor(15, 23, 42);
  }

  function drawTableHeader(y) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(229, 231, 235);
    doc.rect(mL, y, usableW, tableHeaderH, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSizeHead);
    doc.setTextColor(51, 65, 85);

    let x = mL;
    for (let i = 0; i < columns.length; i++) {
      const key = columns[i];
      const w = finalWidths[i];
      const label = headerLabels?.[key] ?? String(key);

      doc.text(String(label), x + cellPadX, y + 5.4, { align: "left" });
      x += w;
    }

    doc.setTextColor(15, 23, 42);
  }

  function measureRowHeight(row) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSizeBody);

    let maxLines = 1;

    for (let i = 0; i < columns.length; i++) {
      const key = columns[i];
      const w = finalWidths[i];
      const text = getCellText(row, key);

      const maxL = getMaxLinesForKey(key, columns);
      const lines = splitLines(doc, text, w - cellPadX * 2, maxL);

      maxLines = Math.max(maxLines, lines.length);
    }

    const h = cellPadY * 2 + maxLines * lineH;
    return Math.max(10, h);
  }

  function simulateTotalPages() {
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

  function drawRow(y, row, rh) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSizeBody);
    doc.setDrawColor(229, 231, 235);

    doc.setFillColor(255, 255, 255);
    doc.rect(mL, y, usableW, rh, "F");
    doc.line(mL, y + rh, mL + usableW, y + rh);

    let x = mL;

    for (let i = 0; i < columns.length; i++) {
      const key = columns[i];
      const w = finalWidths[i];
      const text = getCellText(row, key);

      const maxL = getMaxLinesForKey(key, columns);
      const lines = splitLines(doc, text, w - cellPadX * 2, maxL);

      for (let li = 0; li < lines.length; li++) {
        const ty = y + 6 + li * lineH;
        if (ty > y + rh - 1) break;
        doc.text(String(lines[li]), x + cellPadX, ty, { align: "left" });
      }

      x += w;
    }
  }

  const totalPages = simulateTotalPages();

  let page = 1;
  drawHeader();
  drawTableHeader(yTopTable);

  let y = yTopTable + tableHeaderH;

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

    drawRow(y, r, rh);
    y += rh;
  }

  drawFooter(page, totalPages);

  const fileName = `HSQE Assistant - ${filenameTitle} - ${stamp.date}.pdf`;
  doc.save(fileName);
}

// --------------------
// Public exports (wrappers)
// --------------------
export function exportFindingsListPdf({
  hasActiveFilters,
  allRows,
  filteredRows,
  columns,
  headerLabels,
  colWidthsMM,
  getCellText,
  orientation = "auto",
}) {
  const rows = pickRowsForExport({
    hasActiveFilters,
    allRows,
    filteredRows,
    confirmText: "Export PDF\n\nOK: Only filtered results\nCancel: All findings",
  });

  exportTablePdfMM({
    reportTitle: "Findings List Report",
    filenameTitle: "Findings List Report",
    rows,
    columns,
    headerLabels,
    colWidthsMM,
    getCellText,
    orientation,
  });
}

export function exportInspectionReportsPdf({
  hasActiveFilters,
  allRows,
  filteredRows,
  columns,
  headerLabels,
  colWidthsMM,
  getCellText,
  orientation = "auto",
}) {
  const rows = pickRowsForExport({
    hasActiveFilters,
    allRows,
    filteredRows,
    confirmText:
      "Export PDF\n\nOK: Only filtered results\nCancel: All inspection reports",
  });

  exportTablePdfMM({
    reportTitle: "Inspection Reports Report",
    filenameTitle: "Inspection Reports Report",
    rows,
    columns,
    headerLabels,
    colWidthsMM,
    getCellText,
    orientation,
  });
}

export function exportStatisticsPdf({
  rows,
  columns,
  headerLabels,
  colWidthsMM,
  getCellText,
  hasActiveFilters,
  allRows,
  filteredRows,
  orientation = "p",
}) {
  const finalRows =
    Array.isArray(allRows) && Array.isArray(filteredRows)
      ? pickRowsForExport({
          hasActiveFilters: Boolean(hasActiveFilters),
          allRows,
          filteredRows,
          confirmText:
            "Export PDF\n\nOK: Only filtered results\nCancel: All statistics",
        })
      : rows;

  exportTablePdfMM({
    reportTitle: "Statistics Report",
    filenameTitle: "Statistics Report",
    rows: finalRows || [],
    columns,
    headerLabels,
    colWidthsMM,
    getCellText,
    orientation,
  });
}

export function exportTasksPdf({
  hasActiveFilters,
  allRows,
  filteredRows,
  columns,
  headerLabels,
  colWidthsMM,
  getCellText,
  orientation = "p",
}) {
  const rows = pickRowsForExport({
    hasActiveFilters,
    allRows,
    filteredRows,
    confirmText: "Export PDF\n\nOK: Only filtered results\nCancel: All tasks",
  });

  exportTablePdfMM({
    reportTitle: "Tasks Report",
    filenameTitle: "Tasks Report",
    rows,
    columns,
    headerLabels,
    colWidthsMM,
    getCellText,
    orientation,
  });
}
