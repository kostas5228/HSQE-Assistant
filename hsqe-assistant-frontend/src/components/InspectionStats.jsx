// src/components/InspectionStats.jsx
import React from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "../api";

// --------------------
// Helpers (dates / strings)
// --------------------
function safeStr(v) {
  return (v ?? "").toString();
}
function normalizeKey(v, fallback = "") {
  const s = safeStr(v).trim();
  return s ? s : fallback;
}
function lower(v) {
  return normalizeKey(v, "").toLowerCase();
}
function safeIso(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function inRange(iso, from, to) {
  const d = safeIso(iso);
  if (!d) return false;
  const dd = d.getTime();

  if (from) {
    const f = safeIso(from);
    if (f && dd < startOfDay(f).getTime()) return false;
  }
  if (to) {
    const t = safeIso(to);
    if (t && dd > endOfDay(t).getTime()) return false;
  }
  return true;
}
function formatDMY(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function uniqSorted(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)))
    .map((x) => String(x).trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function coerceStringList(v) {
  // Accept: ["A","B"] OR [{name:"A"}] OR [{label:"A"}] etc.
  const a = Array.isArray(v) ? v : [];
  return a
    .map((x) => (typeof x === "string" ? x : x?.name || x?.label || x?.value || x?.vessel))
    .filter(Boolean)
    .map((x) => String(x).trim())
    .filter(Boolean);
}

// --------------------
// Period bucketing (YEAR / QUARTER)
// --------------------
function yearKeyFromDate(d) {
  return `${d.getFullYear()}`;
}
function quarterFromDate(d) {
  const m = d.getMonth();
  return Math.floor(m / 3) + 1;
}
function quarterKeyFromDate(d) {
  const y = d.getFullYear();
  const q = quarterFromDate(d);
  return `${y}-Q${q}`;
}
function labelForYearKey(k) {
  return k || "—";
}
function labelForQuarterKey(k) {
  if (!k) return "—";
  const y = k.slice(0, 4);
  const q = k.slice(5);
  return `${q} ${y}`;
}
function periodKeyFromIso(iso, granularity) {
  const d = safeIso(iso);
  if (!d) return "";
  if (granularity === "quarter") return quarterKeyFromDate(d);
  return yearKeyFromDate(d);
}
function periodLabelFromKey(key, granularity) {
  if (granularity === "quarter") return labelForQuarterKey(key);
  return labelForYearKey(key);
}
function startOfYear(d) {
  return new Date(d.getFullYear(), 0, 1);
}
function startOfQuarter(d) {
  const q = quarterFromDate(d);
  const m = (q - 1) * 3;
  return new Date(d.getFullYear(), m, 1);
}
function addYears(d, n) {
  return new Date(d.getFullYear() + n, 0, 1);
}
function addQuarters(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n * 3, 1);
}
function periodStartFromKey(key, granularity) {
  if (!key) return null;
  if (granularity === "quarter") {
    const y = Number(key.slice(0, 4));
    const q = Number(key.slice(6, 7));
    if (!Number.isFinite(y) || !Number.isFinite(q)) return null;
    return new Date(y, (q - 1) * 3, 1);
  }
  const y = Number(key);
  if (!Number.isFinite(y)) return null;
  return new Date(y, 0, 1);
}
function periodsBetween(fromIso, toIso, granularity) {
  const fromD0 = safeIso(fromIso);
  const toD0 = safeIso(toIso);
  if (!fromD0 || !toD0) return [];

  const fromD =
    granularity === "quarter" ? startOfQuarter(fromD0) : startOfYear(fromD0);
  const toD =
    granularity === "quarter" ? startOfQuarter(toD0) : startOfYear(toD0);

  const out = [];
  let cur = fromD;
  let guard = 0;

  while (cur.getTime() <= toD.getTime() && guard < 480) {
    out.push(
      granularity === "quarter" ? quarterKeyFromDate(cur) : yearKeyFromDate(cur)
    );
    cur = granularity === "quarter" ? addQuarters(cur, 1) : addYears(cur, 1);
    guard += 1;
  }
  return out;
}

// Normalize inspection type (case/spacing tolerant)
function typeNorm(raw) {
  const t = lower(raw);
  if (t === "psc") return "PSC";
  if (t === "flag") return "Flag";
  if (t === "vetting") return "Vetting";
  if (!t) return "";
  return normalizeKey(raw, "");
}

function percent(n, d) {
  if (!d) return 0;
  return (n / d) * 100;
}
function round1(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10) / 10;
}

// --------------------
// ✅ Vetting validity helpers (0/3/6/9/12 months)
// --------------------
const VALIDITY_BUCKETS = [0, 3, 6, 9, 12];
function getVettingValidityMonths(report) {
  const v = Number(report?.validity_months);
  return VALIDITY_BUCKETS.includes(v) ? v : 0;
}
function buildVettingValidityByPeriod(vetReports, fromIso, toIso, granularity) {
  const rows = Array.isArray(vetReports) ? vetReports : [];
  const bucket = new Map();

  for (const r of rows) {
    if (typeNorm(r?.inspection_type) !== "Vetting") continue;

    const okDate = fromIso || toIso ? inRange(r?.date, fromIso, toIso) : true;
    if (!okDate) continue;

    const k = periodKeyFromIso(r?.date, granularity);
    if (!k) continue;

    if (!bucket.has(k)) {
      bucket.set(k, {
        total: 0,
        byValidity: { 0: 0, 3: 0, 6: 0, 9: 0, 12: 0 },
      });
    }

    const entry = bucket.get(k);
    const months = getVettingValidityMonths(r);

    entry.total += 1;
    entry.byValidity[months] += 1;
  }

  return bucket;
}

function buildValidityPeriodSeries(validityMap, fromIso, toIso, granularity) {
  const map = validityMap instanceof Map ? validityMap : new Map();

  const keys = periodsBetween(fromIso, toIso, granularity);
  const finalKeys =
    keys.length > 0
      ? keys
      : Array.from(map.keys()).sort((a, b) => {
          const da = periodStartFromKey(a, granularity)?.getTime?.() ?? 0;
          const db = periodStartFromKey(b, granularity)?.getTime?.() ?? 0;
          return da - db;
        });

  if (finalKeys.length === 0) {
    return [
      {
        key: "—",
        label: "—",
        total: 0,
        counts: { 12: 0, 9: 0, 6: 0, 3: 0, 0: 0 },
        pct: { 12: 0, 9: 0, 6: 0, 3: 0, 0: 0 },
      },
    ];
  }

  return finalKeys.map((k) => {
    const entry = map.get(k) || {
      total: 0,
      byValidity: { 0: 0, 3: 0, 6: 0, 9: 0, 12: 0 },
    };
    const total = Number(entry.total || 0) || 0;

    const counts = {
      12: Number(entry.byValidity?.[12] || 0) || 0,
      9: Number(entry.byValidity?.[9] || 0) || 0,
      6: Number(entry.byValidity?.[6] || 0) || 0,
      3: Number(entry.byValidity?.[3] || 0) || 0,
      0: Number(entry.byValidity?.[0] || 0) || 0,
    };

    const pct = {
      12: percent(counts[12], total),
      9: percent(counts[9], total),
      6: percent(counts[6], total),
      3: percent(counts[3], total),
      0: percent(counts[0], total),
    };

    return {
      key: k,
      label: periodLabelFromKey(k, granularity),
      total,
      counts,
      pct,
    };
  });
}

function Pill({ children, style }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        background: "#f8fafc",
        color: "#0f172a",
        fontWeight: 900,
        fontSize: 12,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function ValidityByPeriod({ validityMap, fromIso, toIso, granularity }) {
  const series = React.useMemo(
    () => buildValidityPeriodSeries(validityMap, fromIso, toIso, granularity),
    [validityMap, fromIso, toIso, granularity]
  );

  const seg = {
    12: { bg: "#dcfce7", border: "#86efac", text: "#166534" },
    9: { bg: "#e0f2fe", border: "#7dd3fc", text: "#075985" },
    6: { bg: "#ede9fe", border: "#c4b5fd", text: "#5b21b6" },
    3: { bg: "#ffedd5", border: "#fdba74", text: "#9a3412" },
    0: { bg: "#0f172a", border: "#0f172a", text: "white" },
  };

  const order = [12, 9, 6, 3, 0];

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        background: "white",
        padding: 12,
        display: "grid",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 950, color: "#0f172a" }}>
          Vetting validity distribution
        </div>
        <div style={{ fontWeight: 900, color: "#64748b", fontSize: 12 }}>
          {granularity === "quarter" ? "Quarterly" : "Yearly"} (based on selected
          Date from/to)
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {order.map((m) => (
          <Pill
            key={`leg_${m}`}
            style={{
              background: seg[m].bg,
              borderColor: seg[m].border,
              color: seg[m].text,
            }}
          >
            {m === 0 ? "0m" : `${m}m`}
          </Pill>
        ))}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {series.map((p) => {
          const total = Number(p.total || 0) || 0;

          return (
            <div key={`valid_${p.key}`} style={{ display: "grid", gap: 6 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 950, color: "#0f172a" }}>
                  {p.label}
                </div>
                <div style={{ fontWeight: 900, color: "#64748b" }}>
                  Total:{" "}
                  <span style={{ fontWeight: 990, color: "#0f172a" }}>
                    {total}
                  </span>
                </div>
              </div>

              <div
                style={{
                  height: 18,
                  borderRadius: 999,
                  overflow: "hidden",
                  border: "1px solid #e5e7eb",
                  background: "#f8fafc",
                  display: "flex",
                }}
                title="Stacked % by validity months"
              >
                {order.map((m) => {
                  const w = total ? p.pct[m] : 0;
                  return (
                    <div
                      key={`seg_${p.key}_${m}`}
                      style={{ width: `${w}%`, background: seg[m].bg }}
                    />
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {order.map((m) => (
                  <Pill
                    key={`nums_${p.key}_${m}`}
                    style={{
                      background: seg[m].bg,
                      borderColor: seg[m].border,
                      color: seg[m].text,
                    }}
                  >
                    {m === 0 ? "0m" : `${m}m`}: {Math.round(p.pct[m])}% (
                    {p.counts[m]})
                  </Pill>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --------------------
// ✅ Code helper: FIRST 2 chars (prefix)
// --------------------
function codePrefix2(raw) {
  const s = normalizeKey(raw, "").trim();
  if (!s) return "";
  return s.slice(0, 2).toUpperCase();
}

// --------------------
// ✅ Frequency chart: PSC(VIA Deficiency) / Vetting(VIA Finding) by prefix-2
//    NOTE: 99 is a NORMAL code and IS INCLUDED.
// --------------------
function buildCodeFrequency(findingsRows, codeGroupsMap, allowedFindingTypes = []) {
  const rows = Array.isArray(findingsRows) ? findingsRows : [];
  const mapObj = codeGroupsMap && typeof codeGroupsMap === "object" ? codeGroupsMap : {};

  const allow = new Set(
    (Array.isArray(allowedFindingTypes) ? allowedFindingTypes : [])
      .map((x) => lower(x))
      .filter(Boolean)
  );

  const counts = new Map(); // key(prefix2) -> count
  for (const r of rows) {
    const ft = lower(r?.finding_type);

    if (allow.size > 0 && !allow.has(ft)) continue;

    const key = codePrefix2(r?.code);
    if (!key) continue;

    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const list = Array.from(counts.entries()).map(([key, count]) => {
    const labelRaw = mapObj[key];
    const label =
      typeof labelRaw === "string" && labelRaw.trim() ? labelRaw.trim() : key;
    return { key, label, count };
  });

  return list.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function FrequencyByCode({
  title,
  subtitle,
  items,
  visibleRows = 5,
  emptyText = "No coded rows found in the selected scope.",
}) {
  const list = Array.isArray(items) ? items : [];
  const total = list.reduce((s, x) => s + (Number(x.count) || 0), 0) || 0;

  const ROW_H = 56;
  const maxH = Math.max(ROW_H * 2, ROW_H * Number(visibleRows || 5));

  const max = Math.max(1, ...list.map((x) => Number(x.count) || 0));

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        background: "white",
        padding: 12,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontWeight: 950, color: "#0f172a" }}>{title}</div>
        {subtitle ? (
          <div style={{ color: "#64748b", fontWeight: 850, fontSize: 12 }}>
            {subtitle}
          </div>
        ) : null}
      </div>

      {total === 0 ? (
        <div style={{ color: "#64748b", fontWeight: 900 }}>{emptyText}</div>
      ) : (
        <div
          style={{
            maxHeight: maxH,
            overflowY: "auto",
            paddingRight: 6,
          }}
        >
          <div style={{ display: "grid", gap: 10 }}>
            {list.map((it) => {
              const w = (Number(it.count) || 0) / max;
              const pct = total ? Math.round((it.count / total) * 100) : 0;

              return (
                <div key={`freq_${it.key}`} style={{ display: "grid", gap: 6 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ fontWeight: 950, color: "#0f172a" }}>
                      <span style={{ color: "#64748b", fontWeight: 900 }}>
                        {it.key}
                      </span>{" "}
                      • {it.label}
                    </div>
                    <div style={{ fontWeight: 950, color: "#0f172a" }}>
                      {it.count}{" "}
                      <span style={{ color: "#64748b", fontWeight: 900 }}>
                        ({pct}%)
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      height: 12,
                      borderRadius: 999,
                      overflow: "hidden",
                      border: "1px solid #e5e7eb",
                      background: "#f8fafc",
                    }}
                    title={`${it.count} (${pct}%)`}
                  >
                    <div
                      style={{
                        width: `${Math.round(w * 100)}%`,
                        height: "100%",
                        background: "#0f172a",
                        opacity: 0.18,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------
// KPI computation helpers
// --------------------
function getDeficienciesCount(r) {
  const c = r?.counts && typeof r.counts === "object" ? r.counts : null;
  if (c) {
    const v =
      c.Deficiency ??
      c.Deficiencies ??
      c.deficiency ??
      c.deficiencies ??
      undefined;
    if (v !== undefined) return Number(v) || 0;
  }
  return Number(r?.deficiencies) || 0;
}
function getFindingsCount(r) {
  const c = r?.counts && typeof r.counts === "object" ? r.counts : null;
  if (c) {
    const v =
      c.Finding ??
      c.Findings ??
      c.finding ??
      c.findings ??
      c.TotalFindings ??
      c.totalFindings ??
      undefined;
    if (v !== undefined) return Number(v) || 0;
  }
  return Number(r?.findings) || 0;
}

// --------------------
// Build series within selected from/to
// --------------------
function buildPeriodComboSeries(rows, fromIso, toIso, metricFn, granularity) {
  const r = Array.isArray(rows) ? rows : [];
  const bucket = new Map();

  for (const it of r) {
    const okDate = fromIso || toIso ? inRange(it?.date, fromIso, toIso) : true;
    if (!okDate) continue;

    const k = periodKeyFromIso(it?.date, granularity);
    if (!k) continue;

    const cur = bucket.get(k) || { count: 0, metricSum: 0 };
    cur.count += 1;
    cur.metricSum += Number(metricFn(it)) || 0;
    bucket.set(k, cur);
  }

  const keys = periodsBetween(fromIso, toIso, granularity);
  const finalKeys =
    keys.length > 0
      ? keys
      : Array.from(bucket.keys()).sort((a, b) => {
          const da = periodStartFromKey(a, granularity)?.getTime?.() ?? 0;
          const db = periodStartFromKey(b, granularity)?.getTime?.() ?? 0;
          return da - db;
        });

  if (finalKeys.length === 0) return [{ label: "—", bars: 0, line: 0 }];

  return finalKeys.map((k) => {
    const v = bucket.get(k) || { count: 0, metricSum: 0 };
    const avg = v.count ? v.metricSum / v.count : 0;
    return {
      key: k,
      label: periodLabelFromKey(k, granularity),
      bars: v.count,
      line: avg,
    };
  });
}

// --------------------
// UI building blocks
// --------------------
function Card({ title, subtitle, right, children }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        background: "white",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: 14,
          borderBottom: "1px solid #f1f5f9",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 980, color: "#0f172a" }}>{title}</div>
          {subtitle ? (
            <div
              style={{
                marginTop: 4,
                fontWeight: 800,
                color: "#64748b",
                fontSize: 13,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function KPI({ label, value, hint, accent = "#0f172a" }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        background: "white",
        padding: 12,
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ fontWeight: 900, color: "#64748b", fontSize: 12 }}>
        {label}
      </div>
      <div
        style={{
          fontWeight: 990,
          color: accent,
          fontSize: 28,
          lineHeight: 1.05,
        }}
      >
        {value}
      </div>
      {hint ? (
        <div style={{ fontWeight: 850, color: "#94a3b8", fontSize: 12 }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function Input({ type, value, onChange, placeholder }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        height: 42,
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: "0 12px",
        background: "white",
        fontWeight: 900,
        color: "#0f172a",
        outline: "none",
      }}
    />
  );
}

function ButtonGhost({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "9px 12px",
        background: "white",
        fontWeight: 950,
        cursor: "pointer",
        color: "#0f172a",
      }}
    >
      {children}
    </button>
  );
}

function Select({ value, onChange, options, size = "md" }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        height: size === "sm" ? 36 : 42,
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: size === "sm" ? "0 10px" : "0 12px",
        background: "white",
        fontWeight: 900,
        color: "#0f172a",
        outline: "none",
        cursor: "pointer",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// --------------------
// MultiSelect (portal dropdown)
// --------------------
function ChevronDown({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 9l6 6 6-6"
        stroke="#0f172a"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MultiSelect({ placeholder, options, value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef(null);
  const [rect, setRect] = React.useState(null);

  const selectedCount = Array.isArray(value) ? value.length : 0;
  const label = selectedCount === 0 ? placeholder : `${selectedCount} selected`;

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

  function toggle(opt) {
    const cur = Array.isArray(value) ? value : [];
    const exists = cur.includes(opt);
    const next = exists ? cur.filter((x) => x !== opt) : [...cur, opt];
    onChange(next);
  }

  const dropdown =
    open && rect
      ? createPortal(
          <div
            style={{
              position: "fixed",
              left: rect.left,
              top: rect.bottom + 6,
              width: rect.width,
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              boxShadow: "0 18px 52px rgba(2,6,23,0.16)",
              zIndex: 9999,
              overflow: "hidden",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={{ maxHeight: 280, overflow: "auto" }}>
              {options.length === 0 ? (
                <div style={{ padding: 12, color: "#64748b", fontWeight: 900 }}>
                  No options
                </div>
              ) : (
                options.map((opt) => {
                  const checked = (value || []).includes(opt);
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
                      <input type="checkbox" checked={checked} onChange={() => toggle(opt)} />
                      <span style={{ fontWeight: 900, color: "#0f172a" }}>{opt}</span>
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
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => onChange([])}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontWeight: 950,
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
                  borderRadius: 12,
                  border: "1px solid #0f172a",
                  background: "#0f172a",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 950,
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
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          fontWeight: 900,
          color: selectedCount ? "#0f172a" : "#475569",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
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
// Responsive measure hook
// --------------------
function useMeasureWidth() {
  const ref = React.useRef(null);
  const [w, setW] = React.useState(860);

  React.useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const next = Math.floor(entry.contentRect.width || 0);
      if (next > 0) setW(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width: w };
}
function ResponsiveChartBox({ children }) {
  const box = useMeasureWidth();
  return (
    <div ref={box.ref} style={{ width: "100%" }}>
      {children(box.width)}
    </div>
  );
}

// --------------------
// Charts (ComboDualAxisChart)
// --------------------
function niceCeil(x) {
  const n = Number(x);
  if (!Number.isFinite(n) || n <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const m = n / pow;
  let step = 1;
  if (m <= 1) step = 1;
  else if (m <= 2) step = 2;
  else if (m <= 5) step = 5;
  else step = 10;
  return step * pow;
}

function ComboDualAxisChart({
  points,
  width = 860,
  height = 280,
  leftLabel = "Inspections",
  rightLabel = "Avg",
  xLabel = "PERIOD",
  leftUnit = "insp",
  rightUnit = "",
  rightDecimals = 1,
  showDataLabels = true,
}) {
  const w = Math.max(320, width);
  const h = height;

  const padL = 62;
  const padR = 62;
  const padT = 18;
  const padB = 56;

  const innerW = Math.max(10, w - padL - padR);
  const innerH = Math.max(10, h - padT - padB);

  const pts = Array.isArray(points) ? points : [];
  const n = pts.length || 1;
  const stepX = n > 1 ? innerW / n : innerW;

  const rawMaxBars = Math.max(0, ...pts.map((p) => Number(p?.bars || 0)));
  const rawMaxLine = Math.max(0, ...pts.map((p) => Number(p?.line || 0)));

  const maxBars = Math.max(1, Math.ceil(rawMaxBars));
  const maxLine = niceCeil(Math.max(0, rawMaxLine));

  function xCenter(i) {
    return padL + stepX * i + stepX / 2;
  }
  function yBars(v) {
    const t = (Number(v || 0) / (maxBars || 1)) || 0;
    return padT + innerH * (1 - t);
  }
  function yLine(v) {
    const t = (Number(v || 0) / (maxLine || 1)) || 0;
    return padT + innerH * (1 - t);
  }

  const barW = Math.max(6, Math.min(36, stepX * 0.55));
  const barR = 6;

  const linePoly = pts.map((p, i) => `${xCenter(i)},${yLine(p.line)}`).join(" ");

  const fmtRight = (v) => {
    const x = Number(v || 0);
    const rounded =
      rightDecimals === 0 ? Math.round(x) : Math.round(x * 10) / 10;
    return `${rounded}${rightUnit ? ` ${rightUnit}` : ""}`;
  };

  const leftTickValues = (() => {
    if (maxBars <= 10) return Array.from({ length: maxBars + 1 }, (_, i) => i);
    const ticks = 5;
    const step = Math.max(1, Math.ceil(maxBars / ticks));
    const out = [];
    for (let v = 0; v <= maxBars; v += step) out.push(v);
    if (out[out.length - 1] !== maxBars) out.push(maxBars);
    return out;
  })();

  const tickGrid = leftTickValues.map((lv) => {
    const t = maxBars ? lv / maxBars : 0;
    const y = padT + innerH * (1 - t);
    const rv = (maxLine || 1) * t;
    return { lv, rv, y };
  });

  const maxLabels = Math.max(2, Math.floor(innerW / 90));
  const labelEvery = n <= maxLabels ? 1 : Math.ceil(n / maxLabels);

  const labelTextForLinePoint = (val) => {
    const x = Number(val || 0);
    const rounded =
      rightDecimals === 0 ? Math.round(x) : Math.round(x * 10) / 10;
    return `${rounded}`;
  };

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {tickGrid.map((t, idx) => (
        <g key={`${t.lv}_${idx}`}>
          <line x1={padL} x2={w - padR} y1={t.y} y2={t.y} stroke="#e5e7eb" />
          <text
            x={padL - 10}
            y={t.y + 4}
            textAnchor="end"
            style={{ fontSize: 11, fontWeight: 900, fill: "#334155" }}
          >
            {`${t.lv}${leftUnit ? ` ${leftUnit}` : ""}`}
          </text>
          <text
            x={w - padR + 10}
            y={t.y + 4}
            textAnchor="start"
            style={{ fontSize: 11, fontWeight: 900, fill: "#475569" }}
          >
            {fmtRight(t.rv)}
          </text>
        </g>
      ))}

      <line x1={padL} x2={padL} y1={padT} y2={h - padB} stroke="#cbd5e1" />
      <line
        x1={w - padR}
        x2={w - padR}
        y1={padT}
        y2={h - padB}
        stroke="#cbd5e1"
      />
      <line
        x1={padL}
        x2={w - padR}
        y1={h - padB}
        y2={h - padB}
        stroke="#cbd5e1"
      />

      {pts.map((p, i) => {
        const x = xCenter(i) - barW / 2;
        const y = yBars(p.bars);
        const hh = Math.max(0, h - padB - y);
        return (
          <rect
            key={`bar_${p.key || p.label}_${i}`}
            x={x}
            y={y}
            width={barW}
            height={hh}
            rx={barR}
            ry={barR}
            fill="#0f172a"
            opacity={0.22}
          />
        );
      })}

      <polyline
        points={linePoly}
        fill="none"
        stroke="#0f172a"
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {pts.map((p, i) => (
        <circle
          key={`dot_${p.key || p.label}_${i}`}
          cx={xCenter(i)}
          cy={yLine(p.line)}
          r={4}
          fill="#0f172a"
        />
      ))}

      {showDataLabels
        ? pts.map((p, i) => {
            const barsVal = Math.round(Number(p?.bars || 0));
            const bx = xCenter(i);
            const by = yBars(p.bars) - 8;
            const showBarLabel = barsVal > 0;

            const lx = xCenter(i) + 10;
            const ly = yLine(p.line) - 10;

            return (
              <g key={`labels_${p.key || p.label}_${i}`}>
                {showBarLabel ? (
                  <text
                    x={bx}
                    y={Math.max(padT + 10, by)}
                    textAnchor="middle"
                    style={{ fontSize: 12, fontWeight: 950, fill: "#0f172a" }}
                  >
                    {barsVal}
                  </text>
                ) : null}

                <text
                  x={Math.min(w - padR - 6, lx)}
                  y={Math.max(padT + 12, ly)}
                  textAnchor="start"
                  style={{ fontSize: 12, fontWeight: 950, fill: "#0f172a" }}
                >
                  {labelTextForLinePoint(p.line)}
                </text>
              </g>
            );
          })
        : null}

      {pts.map((p, i) => {
        const show = i % labelEvery === 0 || i === 0 || i === n - 1;
        if (!show) return null;
        return (
          <text
            key={`x_${p.key || p.label}_${i}`}
            x={xCenter(i)}
            y={h - 22}
            textAnchor="middle"
            style={{ fontSize: 11, fontWeight: 900, fill: "#334155" }}
          >
            {p.label}
          </text>
        );
      })}

      {leftLabel ? (
        <text
          x={18}
          y={padT + innerH / 2}
          textAnchor="middle"
          transform={`rotate(-90 18 ${padT + innerH / 2})`}
          style={{ fontSize: 12, fontWeight: 950, fill: "#0f172a" }}
        >
          {leftLabel}
        </text>
      ) : null}

      {rightLabel ? (
        <text
          x={w - 18}
          y={padT + innerH / 2}
          textAnchor="middle"
          transform={`rotate(90 ${w - 18} ${padT + innerH / 2})`}
          style={{ fontSize: 12, fontWeight: 950, fill: "#0f172a" }}
        >
          {rightLabel}
        </text>
      ) : null}

      {xLabel ? (
        <text
          x={padL + innerW / 2}
          y={h - 6}
          textAnchor="middle"
          style={{ fontSize: 12, fontWeight: 950, fill: "#0f172a" }}
        >
          {xLabel}
        </text>
      ) : null}
    </svg>
  );
}

// --------------------
// MAIN
// --------------------
export default function InspectionStats({
  inspections = [],
  reports = [],
  vessels = [],
  types = [],
  isCompact = false,
}) {
  // ✅ Pull code-group maps from Settings (editable)
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const pscCodeGroups = settingsData?.pscCodeGroups || {};
  const vettingCodeGroups = settingsData?.vettingCodeGroups || {};

    // ✅ Dropdowns from Settings (fallback to props if settings empty)
  const vesselOptions = React.useMemo(() => {
    const fromSettings = coerceStringList(settingsData?.vessels);
    const fromProps = coerceStringList(vessels);

    // Prefer Settings. If empty, fallback to props.
    return uniqSorted(fromSettings.length ? fromSettings : fromProps);
  }, [settingsData?.vessels, vessels]);

  const typeOptions = React.useMemo(() => {
    const fromSettings = coerceStringList(settingsData?.inspectionTypes);
    const fromProps = coerceStringList(types);

    // Prefer Settings. If empty, fallback to props.
    return uniqSorted(fromSettings.length ? fromSettings : fromProps);
  }, [settingsData?.inspectionTypes, types]);

  // ✅ Removed viewBy: always overall
  const [filters, setFilters] = React.useState({
    vessels: [],
    types: [],
    dateFrom: "",
    dateTo: "",
  });

  const [chartBuckets, setChartBuckets] = React.useState({
    psc: "year",
    flag: "year",
    vetting: "year",
  });

  function clearAll() {
    setFilters({
      vessels: [],
      types: [],
      dateFrom: "",
      dateTo: "",
    });
  }

  const selectedTypeNormSet = React.useMemo(() => {
    const arr = Array.isArray(filters.types) ? filters.types : [];
    return new Set(arr.map((x) => typeNorm(x)));
  }, [filters.types]);

  const scopedReports = React.useMemo(() => {
    const vset = new Set(filters.vessels || []);
    const tset = selectedTypeNormSet;
    const from = filters.dateFrom;
    const to = filters.dateTo;

    return (Array.isArray(reports) ? reports : []).filter((r) => {
      const vessel = normalizeKey(r?.vessel, "");
      const typ = typeNorm(r?.inspection_type);
      const okVessel = vset.size === 0 || vset.has(vessel);
      const okType = tset.size === 0 || tset.has(typ);
      const okDate = from || to ? inRange(r?.date, from, to) : true;
      return okVessel && okType && okDate;
    });
  }, [reports, filters.vessels, selectedTypeNormSet, filters.dateFrom, filters.dateTo]);

  const scopedFindings = React.useMemo(() => {
    const vset = new Set(filters.vessels || []);
    const tset = selectedTypeNormSet;
    const from = filters.dateFrom;
    const to = filters.dateTo;

    return (Array.isArray(inspections) ? inspections : []).filter((r) => {
      const vessel = normalizeKey(r?.vessel, "");
      const typ = typeNorm(r?.inspection_type);
      const okVessel = vset.size === 0 || vset.has(vessel);
      const okType = tset.size === 0 || tset.has(typ);
      const okDate = from || to ? inRange(r?.date, from, to) : true;
      return okVessel && okType && okDate;
    });
  }, [inspections, filters.vessels, selectedTypeNormSet, filters.dateFrom, filters.dateTo]);

  // ✅ Always overall single group
  const computed = React.useMemo(() => {
    const rRows = scopedReports;
    const fRows = scopedFindings;

    const pscReports = rRows.filter((x) => typeNorm(x?.inspection_type) === "PSC");
    const flagReports = rRows.filter((x) => typeNorm(x?.inspection_type) === "Flag");
    const vetReports = rRows.filter((x) => typeNorm(x?.inspection_type) === "Vetting");

    const vetValidityByPeriod = buildVettingValidityByPeriod(
      vetReports,
      filters.dateFrom,
      filters.dateTo,
      chartBuckets.vetting
    );

    // PSC KPIs
    const pscInspections = pscReports.length;
    const pscDefTotal = pscReports.reduce((acc, r) => acc + getDeficienciesCount(r), 0);
    const pscAvgDefPerInspection = pscInspections ? pscDefTotal / pscInspections : 0;
    const pscDetentions = pscReports.reduce((acc, r) => acc + (r?.detention ? 1 : 0), 0);
    const pscDetRate = percent(pscDetentions, pscInspections);

    // Flag KPIs
    const flagInspections = flagReports.length;
    const flagDefTotal = flagReports.reduce((acc, r) => acc + getDeficienciesCount(r), 0);
    const flagAvgDefPerInspection = flagInspections ? flagDefTotal / flagInspections : 0;
    const flagDetentions = flagReports.reduce((acc, r) => acc + (r?.detention ? 1 : 0), 0);
    const flagDetRate = percent(flagDetentions, flagInspections);

    // Vetting KPIs
    const vetInspections = vetReports.length;
    const vetFindingsTotal = vetReports.reduce((acc, r) => acc + getFindingsCount(r), 0);
    const vetAvgFindingsPerInspection = vetInspections ? vetFindingsTotal / vetInspections : 0;

    // Series
    const pscSeries = buildPeriodComboSeries(
      pscReports,
      filters.dateFrom,
      filters.dateTo,
      (r) => getDeficienciesCount(r),
      chartBuckets.psc
    );
    const flagSeries = buildPeriodComboSeries(
      flagReports,
      filters.dateFrom,
      filters.dateTo,
      (r) => getDeficienciesCount(r),
      chartBuckets.flag
    );
    const vetSeries = buildPeriodComboSeries(
      vetReports,
      filters.dateFrom,
      filters.dateTo,
      (r) => getFindingsCount(r),
      chartBuckets.vetting
    );

    // Frequency datasets:
    // PSC -> ONLY Deficiencies
    // Vetting -> ONLY Findings
    const pscRows = fRows.filter((x) => typeNorm(x?.inspection_type) === "PSC");
    const vetRows = fRows.filter((x) => typeNorm(x?.inspection_type) === "Vetting");

    const pscFreq = buildCodeFrequency(pscRows, pscCodeGroups, ["Deficiency"]);
    const vetFreq = buildCodeFrequency(vetRows, vettingCodeGroups, ["Finding"]);

    return {
      psc: {
        inspections: pscInspections,
        defTotal: pscDefTotal,
        avgDefPerInspection: pscAvgDefPerInspection,
        detRate: pscDetRate,
        detentions: pscDetentions,
        series: pscSeries,
        freqDef: pscFreq,
      },
      flag: {
        inspections: flagInspections,
        defTotal: flagDefTotal,
        avgDefPerInspection: flagAvgDefPerInspection,
        detRate: flagDetRate,
        detentions: flagDetentions,
        series: flagSeries,
      },
      vetting: {
        inspections: vetInspections,
        findingsTotal: vetFindingsTotal,
        avgFindingsPerInspection: vetAvgFindingsPerInspection,
        series: vetSeries,
        validityByPeriod: vetValidityByPeriod,
        freqFinding: vetFreq,
      },
    };
  }, [
    scopedReports,
    scopedFindings,
    filters.dateFrom,
    filters.dateTo,
    chartBuckets.psc,
    chartBuckets.flag,
    chartBuckets.vetting,
    pscCodeGroups,
    vettingCodeGroups,
  ]);

  const hasReports = Array.isArray(reports) && reports.length > 0;

  const visibleSections = React.useMemo(() => {
    const tset = selectedTypeNormSet;
    const hasSelection = tset.size > 0;
    const showPSC = !hasSelection || tset.has("PSC");
    const showFlag = !hasSelection || tset.has("Flag");
    const showVetting = !hasSelection || tset.has("Vetting");
    return { showPSC, showFlag, showVetting };
  }, [selectedTypeNormSet]);

  const scopeLabel = React.useMemo(() => {
    const a = filters.dateFrom ? formatDMY(filters.dateFrom) : "…";
    const b = filters.dateTo ? formatDMY(filters.dateTo) : "…";
    return `${a} → ${b}`;
  }, [filters.dateFrom, filters.dateTo]);

  const bucketSelect = (value, onChange) => (
    <Select
      size="sm"
      value={value}
      onChange={onChange}
      options={[
        { value: "year", label: "Yearly" },
        { value: "quarter", label: "Quarterly" },
      ]}
    />
  );

  const chartXLabel = (bucket) => (bucket === "quarter" ? "QUARTER" : "YEAR");

  return (
  <div style={{ display: "grid", gap: 16 }}>
    <Card
      title="Scope"
      right={
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <Pill>
            Findings rows: {Array.isArray(inspections) ? inspections.length : 0}
          </Pill>
          <Pill>Reports: {Array.isArray(reports) ? reports.length : 0}</Pill>
        </div>
      }
    >
      {!hasReports ? (
        <div
          style={{
            border: "1px solid #fde68a",
            background: "#fffbeb",
            borderRadius: 14,
            padding: 12,
            color: "#92400e",
            fontWeight: 900,
            marginBottom: 12,
          }}
        >
          Για “inspection-level” KPIs χρειάζεται και το <b>reports</b> prop (δηλ.{" "}
          <code>inspection_reports</code>).
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "1.2fr 1fr 0.9fr 0.9fr",
          gap: 12,
          alignItems: "end",
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 900, color: "#64748b", fontSize: 12 }}>
            Vessels
          </div>
          <MultiSelect
            placeholder="Select vessels"
            options={vesselOptions}
            value={filters.vessels}
            onChange={(next) => setFilters((p) => ({ ...p, vessels: next }))}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 900, color: "#64748b", fontSize: 12 }}>
            Type of inspection
          </div>
          <MultiSelect
            placeholder="Select types"
            options={typeOptions}
            value={filters.types}
            onChange={(next) => setFilters((p) => ({ ...p, types: next }))}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 900, color: "#64748b", fontSize: 12 }}>
            Date from
          </div>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(v) => setFilters((p) => ({ ...p, dateFrom: v }))}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 900, color: "#64748b", fontSize: 12 }}>
            Date to
          </div>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(v) => setFilters((p) => ({ ...p, dateTo: v }))}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <ButtonGhost onClick={clearAll}>Clear all</ButtonGhost>
      </div>
    </Card>

    {/* ✅ EXPORT-ONLY WRAPPER: everything below is what we capture in PDF */}
    <div id="stats-export" style={{ display: "grid", gap: 16 }}>
      {/* ===================== PSC ===================== */}
      {visibleSections.showPSC ? (
        <Card
          title="1️⃣ PSC inspections"
          subtitle="Bars: inspections / period (left). Line: avg deficiencies / inspection (right)."
          right={
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Pill>Period: {scopeLabel}</Pill>
              {bucketSelect(chartBuckets.psc, (v) =>
                setChartBuckets((p) => ({ ...p, psc: v }))
              )}
            </div>
          }
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div
              data-pdf-block
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr 1fr" : "repeat(4, 1fr)",
                gap: 12,
              }}
            >
              <KPI
                label="PSC inspections"
                value={computed.psc.inspections}
                hint="In selected range"
              />
              <KPI
                label="PSC deficiencies"
                value={computed.psc.defTotal}
                hint="Sum in selected range"
              />
              <KPI
                label="Avg deficiencies / inspection"
                value={round1(computed.psc.avgDefPerInspection)}
                hint="Def total / inspections"
              />
              <KPI
                label="Detention rate"
                value={`${round1(computed.psc.detRate)}%`}
                hint={`${computed.psc.detentions} detentions / ${computed.psc.inspections} inspections`}
                accent={computed.psc.detRate > 0 ? "#b91c1c" : "#0f172a"}
              />
            </div>

          <div data-pdf-block>
            <FrequencyByCode
              title="PSC • Deficiency frequency by code (first 2)"
              items={computed.psc.freqDef}
            />
          </div>

            <div
              data-pdf-block
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 12,
                overflow: "hidden",
                background: "white",
              }}
            >
              <div
                style={{
                  fontWeight: 950,
                  color: "#0f172a",
                  marginBottom: 8,
                }}
              >
                Trend ({chartBuckets.psc === "quarter" ? "quarterly" : "yearly"}):
                inspections vs avg def/inspection
              </div>

              <ResponsiveChartBox>
                {(w) => (
                  <ComboDualAxisChart
                    points={computed.psc.series}
                    width={w}
                    height={290}
                    leftLabel="Inspections"
                    rightLabel="Avg def / inspection"
                    xLabel={chartXLabel(chartBuckets.psc)}
                    leftUnit="insp"
                    rightUnit="def"
                    rightDecimals={1}
                    showDataLabels={true}
                  />
                )}
              </ResponsiveChartBox>
            </div>
          </div>
        </Card>
      ) : null}

      {/* ===================== FLAG ===================== */}
      {visibleSections.showFlag ? (
        <Card
          title="2️⃣ Flag inspections"
          subtitle="Bars: inspections / period (left). Line: avg deficiencies / inspection (right)."
          right={
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Pill>Period: {scopeLabel}</Pill>
              {bucketSelect(chartBuckets.flag, (v) =>
                setChartBuckets((p) => ({ ...p, flag: v }))
              )}
            </div>
          }
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div
              data-pdf-block
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr 1fr" : "repeat(4, 1fr)",
                gap: 12,
              }}
            >
              <KPI
                label="Flag inspections"
                value={computed.flag.inspections}
                hint="In selected range"
              />
              <KPI
                label="Flag deficiencies"
                value={computed.flag.defTotal}
                hint="Sum in selected range"
              />
              <KPI
                label="Avg deficiencies / inspection"
                value={round1(computed.flag.avgDefPerInspection)}
                hint="Def total / inspections"
              />
              <KPI
                label="Detention rate"
                value={`${round1(computed.flag.detRate)}%`}
                hint={`${computed.flag.detentions} detentions / ${computed.flag.inspections} inspections`}
                accent={computed.flag.detRate > 0 ? "#b91c1c" : "#0f172a"}
              />
            </div>

            <div
              data-pdf-block
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 12,
                overflow: "hidden",
                background: "white",
              }}
            >
              <div
                style={{
                  fontWeight: 950,
                  color: "#0f172a",
                  marginBottom: 8,
                }}
              >
                Trend ({chartBuckets.flag === "quarter" ? "quarterly" : "yearly"}):
                inspections vs avg def/inspection
              </div>

              <ResponsiveChartBox>
                {(w) => (
                  <ComboDualAxisChart
                    points={computed.flag.series}
                    width={w}
                    height={290}
                    leftLabel="Inspections"
                    rightLabel="Avg def / inspection"
                    xLabel={chartXLabel(chartBuckets.flag)}
                    leftUnit="insp"
                    rightUnit="def"
                    rightDecimals={1}
                    showDataLabels={true}
                  />
                )}
              </ResponsiveChartBox>
            </div>
          </div>
        </Card>
      ) : null}

      {/* ===================== VETTING ===================== */}
      {visibleSections.showVetting ? (
        <Card
          title="3️⃣ Vetting inspections"
          subtitle="Bars: inspections / period (left). Line: avg FINDINGS / inspection (right)."
          right={
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Pill>Period: {scopeLabel}</Pill>
              {bucketSelect(chartBuckets.vetting, (v) =>
                setChartBuckets((p) => ({ ...p, vetting: v }))
              )}
            </div>
          }
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div
              data-pdf-block
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr 1fr" : "repeat(4, 1fr)",
                gap: 12,
              }}
            >
              <KPI
                label="Vetting inspections"
                value={computed.vetting.inspections}
                hint="In selected range"
              />
              <KPI
                label="Vetting findings"
                value={computed.vetting.findingsTotal}
                hint="Sum in selected range"
              />
              <KPI
                label="Avg findings / inspection"
                value={round1(computed.vetting.avgFindingsPerInspection)}
                hint="Findings total / inspections"
              />
            </div>
          <div data-pdf-block>
            <FrequencyByCode
              title="Vetting • Finding frequency by code (first 2)"
              items={computed.vetting.freqFinding}
            />
          </div>

          <div data-pdf-block>
            <ValidityByPeriod
              validityMap={computed.vetting.validityByPeriod}
              fromIso={filters.dateFrom}
              toIso={filters.dateTo}
              granularity={chartBuckets.vetting}
            />
          </div>

            <div
              data-pdf-block
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 12,
                overflow: "hidden",
                background: "white",
              }}
            >
              <div
                style={{
                  fontWeight: 950,
                  color: "#0f172a",
                  marginBottom: 8,
                }}
              >
                Trend (
                {chartBuckets.vetting === "quarter" ? "quarterly" : "yearly"}):
                inspections vs avg findings/inspection
              </div>

              <ResponsiveChartBox>
                {(w) => (
                  <ComboDualAxisChart
                    points={computed.vetting.series}
                    width={w}
                    height={290}
                    leftLabel="Inspections"
                    rightLabel="Avg findings / inspection"
                    xLabel={chartXLabel(chartBuckets.vetting)}
                    leftUnit="insp"
                    rightUnit="find"
                    rightDecimals={1}
                    showDataLabels={true}
                  />
                )}
              </ResponsiveChartBox>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
    {/* ✅ end stats-export */}
  </div>
);
}

