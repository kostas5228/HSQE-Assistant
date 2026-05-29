// src/api/index.js
//
// Real HTTP API layer that talks to the Spring Boot backend at /api/*.
// Public function surface mirrors src/mock/api.js so swapping it in is a
// drop-in change for every page / component.
//
// Strategy:
//   * Backend currently exposes only flat list endpoints (no pagination,
//     no server-side filtering). To keep the React Query infinite-scroll
//     UI working unchanged, the *page* / *all* helpers fetch the full list
//     ONCE per entity (cached for ~30s, busted on mutations) and apply the
//     same filter / sort / cursor logic client-side.
//   * Backend DTOs use camelCase. The frontend has been built around
//     snake_case shapes. Per-entity `toBE` / `fromBE` mappers translate
//     between them.
//   * Endpoints the backend does not have yet (auth/me, settings, users)
//     are re-exported from the mock so the rest of the app keeps working.

import {
  // ---- mock fallbacks (no backend yet) ----
  getMe as _mockGetMe,
  setSessionEmail as _mockSetSessionEmail,
  listUsers as _mockListUsers,
  updateUser as _mockUpdateUser,
  getSettings as _mockGetSettings,
  updateSettings as _mockUpdateSettings,
} from "../mock/api";

// --------------------------------------------------------------------------
// HTTP plumbing
// --------------------------------------------------------------------------
// In production the frontend is served from a different domain than the backend,
// so we need the full backend URL.  Set VITE_API_BASE_URL at build time
// (e.g. https://your-backend.up.railway.app/api) and Vite will inline it.
// In local dev the Vite proxy rewrites /api → localhost:8080, so the
// empty fallback keeps working without any env var set.
const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function request(method, path, body) {
  const init = { method, headers: { Accept: "application/json" } };
  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, init);

  if (!res.ok) {
    let message = `${method} ${path} failed: HTTP ${res.status}`;
    try {
      const txt = await res.text();
      if (txt) message += ` — ${txt}`;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (res.status === 204) return null;

  const ct = res.headers.get("Content-Type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

// --------------------------------------------------------------------------
// Small per-entity cache so that listX / listXPage / listXAll do not hit
// the backend once per call (each useInfiniteQuery "page" would otherwise
// trigger a fresh fetch). One fetch serves all pages of one filter run;
// mutations call .invalidate() to bust the cache.
// --------------------------------------------------------------------------
function makeListCache(fetcher, ttlMs = 30_000) {
  let cached = null;
  let cachedAt = 0;
  let inflight = null;

  return {
    async load(force = false) {
      const now = Date.now();
      if (!force && cached && now - cachedAt < ttlMs) return cached;
      if (inflight) return inflight;
      inflight = (async () => {
        try {
          const data = await fetcher();
          cached = Array.isArray(data) ? data : [];
          cachedAt = Date.now();
          return cached;
        } finally {
          inflight = null;
        }
      })();
      return inflight;
    },
    invalidate() {
      cached = null;
      cachedAt = 0;
    },
  };
}

// --------------------------------------------------------------------------
// Generic helpers
// --------------------------------------------------------------------------
const DEFAULT_PAGE_SIZE = 30;

function paginate(items, cursor, limit = DEFAULT_PAGE_SIZE) {
  const start = cursor ? Math.max(0, Number(cursor) || 0) : 0;
  const end = start + Math.max(1, Number(limit) || DEFAULT_PAGE_SIZE);
  const slice = items.slice(start, end);
  const nextStart = start + slice.length;
  return {
    items: slice,
    nextCursor: nextStart < items.length ? String(nextStart) : null,
    total: items.length,
  };
}

function nullIfEmpty(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
}

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

// ==========================================================================
// CERTIFICATES
// ==========================================================================
function certFromBE(c) {
  if (!c) return c;
  return {
    id: c.id != null ? String(c.id) : c.id,
    vessel: c.vessel ?? "",
    certificate_code: c.code ?? "",
    type: c.certificateType ?? "",
    certificate_name: c.certificateName ?? "",
    from_date: c.fromDate ?? "",
    to_date: c.toDate ?? "",
    notes: c.notes ?? "",
  };
}

function certToBE(c) {
  return {
    vessel: c?.vessel ?? "",
    code: c?.certificate_code ?? "",
    certificateType: c?.type ?? "",
    certificateName: c?.certificate_name ?? "",
    fromDate: nullIfEmpty(c?.from_date),
    toDate: nullIfEmpty(c?.to_date),
    notes: c?.notes ?? "",
  };
}

const certCache = makeListCache(async () => {
  const list = await request("GET", "/certificates");
  return (list || []).map(certFromBE);
});

export async function listCertificates() {
  return certCache.load();
}

// --- client-side filter+sort (kept identical to the mock so the UI keeps
//     receiving the same ordering / matching) ---
function _certSafeDate(s) {
  if (!s) return null;
  const t = new Date(s);
  return Number.isNaN(t.getTime()) ? null : t;
}
function _certComputeStatus(c, dueWindowDays = 120) {
  const to = _certSafeDate(c?.to_date);
  if (!to) return "valid";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((to.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= dueWindowDays) return "due";
  return "ok";
}
function applyCertificateFilters(list, filters = {}) {
  const { search = "", vesselsSelected = [], typesSelected = [], status = "all" } = filters;
  const q = String(search || "").trim().toLowerCase();
  return list.filter((c) => {
    if (q) {
      const hay = `${c.vessel || ""} ${c.certificate_code || ""} ${c.certificate_name || ""} ${c.type || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (vesselsSelected.length && !vesselsSelected.includes(c.vessel)) return false;
    if (typesSelected.length && !typesSelected.includes(c.type)) return false;
    if (status !== "all" && _certComputeStatus(c, 120) !== status) return false;
    return true;
  });
}
function applyCertificateSort(list, sort = {}) {
  const { key = "vessel", dir = "asc" } = sort;
  const d = dir === "asc" ? 1 : -1;
  const cmp = (x, y) => String(x || "").localeCompare(String(y || ""));
  const out = [...list];
  out.sort((a, b) => {
    if (key === "vessel") {
      const r = cmp(a.vessel, b.vessel);
      if (r !== 0) return d * r;
      return cmp(a.certificate_code, b.certificate_code);
    }
    if (key === "certificate_code") return d * cmp(a.certificate_code, b.certificate_code);
    if (key === "certificate_name") return d * cmp(a.certificate_name, b.certificate_name);
    if (key === "type") return d * cmp(a.type, b.type);
    if (key === "from_date") return d * cmp(a.from_date, b.from_date);
    if (key === "to_date") return d * cmp(a.to_date, b.to_date);
    if (key === "status") return d * cmp(_certComputeStatus(a), _certComputeStatus(b));
    return d * cmp(a.to_date, b.to_date);
  });
  return out;
}

export async function listCertificatesPage({ cursor = null, limit = DEFAULT_PAGE_SIZE, filters = {}, sort = {} } = {}) {
  const all = await certCache.load();
  return paginate(applyCertificateSort(applyCertificateFilters(all, filters), sort), cursor, limit);
}
export async function listCertificatesAll({ filters = {}, sort = {} } = {}) {
  const all = await certCache.load();
  return applyCertificateSort(applyCertificateFilters(all, filters), sort);
}

export async function createCertificate(input) {
  const saved = await request("POST", "/certificates", certToBE(input));
  certCache.invalidate();
  return certFromBE(saved);
}
export async function updateCertificate(id, input) {
  const saved = await request("PUT", `/certificates/${id}`, certToBE(input));
  certCache.invalidate();
  return certFromBE(saved);
}
export async function deleteCertificate(id) {
  await request("DELETE", `/certificates/${id}`);
  certCache.invalidate();
  return true;
}

// ==========================================================================
// INSPECTIONS (Findings)
// ==========================================================================
function inspFromBE(i) {
  if (!i) return i;
  return {
    id: i.id != null ? String(i.id) : i.id,
    date: i.inspectionDate ?? "",
    vessel: i.vessel ?? "",
    inspection_type: i.inspectionType ?? "",
    psc_authority: i.pscAuthority ?? "",
    flag_state: i.flagState ?? "",
    inspector_name: i.inspectorName ?? "",
    place: i.placeOfInspection ?? "",
    cpa_number: i.cpa ?? "",
    code: i.code ?? "",
    finding_type: i.findingType ?? "",
    master: i.master ?? "",
    chief_engineer: i.chiefEngineer ?? "",
    description: i.description ?? "",
    corrective_action: i.correctiveAction ?? "",
    preventive_action: i.preventiveAction ?? "",
    notes: i.notes ?? "",
    // unused on FE but kept defensively
    detention: false,
    cost: 0,
  };
}
function inspToBE(i) {
  return {
    inspectionDate: nullIfEmpty(i?.date),
    vessel: nullIfEmpty(i?.vessel),
    inspectionType: nullIfEmpty(i?.inspection_type),
    pscAuthority: nullIfEmpty(i?.psc_authority),
    flagState: nullIfEmpty(i?.flag_state),
    inspectorName: nullIfEmpty(i?.inspector_name),
    placeOfInspection: nullIfEmpty(i?.place),
    cpa: nullIfEmpty(i?.cpa_number),
    code: nullIfEmpty(i?.code),
    findingType: nullIfEmpty(i?.finding_type),
    master: nullIfEmpty(i?.master),
    chiefEngineer: nullIfEmpty(i?.chief_engineer),
    description: nullIfEmpty(i?.description),
    correctiveAction: nullIfEmpty(i?.corrective_action),
    preventiveAction: nullIfEmpty(i?.preventive_action),
    notes: nullIfEmpty(i?.notes),
  };
}

const inspCache = makeListCache(async () => {
  const list = await request("GET", "/inspections");
  return (list || []).map(inspFromBE);
});

export async function listInspections() {
  return inspCache.load();
}

// search helpers (mirror mock)
function _queryTokens(q) {
  return String(q || "").toLowerCase().split(/[\s,]+/g).map((t) => t.trim()).filter(Boolean);
}
function _haystack(obj, extraKeys = []) {
  const keys = [
    "date", "vessel", "inspection_type", "psc_authority", "flag_state",
    "place", "finding_type", "code", "cpa_number", "description",
    "corrective_action", "preventive_action", "inspector_name",
    "master", "chief_engineer", "notes",
    ...extraKeys,
  ];
  return keys.map((k) => (obj?.[k] ?? "").toString()).join(" ").toLowerCase();
}
function _typeDisplay(it) {
  const type = (it?.inspection_type || "—").toString();
  const t = type.toLowerCase();
  if (t === "psc") {
    const auth = (it?.psc_authority || "").toString().trim();
    return auth ? `${type} - ${auth}` : type;
  }
  if (t === "flag") {
    const flag = (it?.flag_state || "").toString().trim();
    return flag ? `${type} - ${flag}` : type;
  }
  return type;
}
function _withinDate(it, from, to) {
  if (!it?.date) return false;
  const d = new Date(it.date);
  if (Number.isNaN(d.getTime())) return false;
  if (from) {
    const f = new Date(from);
    if (!Number.isNaN(f.getTime()) && d < f) return false;
  }
  if (to) {
    const tD = new Date(to);
    if (!Number.isNaN(tD.getTime())) {
      tD.setHours(23, 59, 59, 999);
      if (d > tD) return false;
    }
  }
  return true;
}
function applyInspectionFilters(list, filters = {}, extra = []) {
  const { vessels = [], types = [], tab = "search", q = "", from = "", to = "" } = filters;
  let out = [...list];
  if (vessels.length) out = out.filter((x) => x.vessel && vessels.includes(x.vessel));
  if (types.length) out = out.filter((x) => (x.inspection_type || "") && types.includes(x.inspection_type));
  if (tab === "search") {
    const tokens = _queryTokens(q);
    if (tokens.length) {
      out = out.filter((x) => {
        const hay = _haystack(x, extra);
        return tokens.every((t) => hay.includes(t));
      });
    }
  } else {
    out = out.filter((x) => _withinDate(x, from, to));
  }
  return out;
}
function _sumCounts(report) {
  const c = report?.counts && typeof report.counts === "object" ? report.counts : null;
  if (c) return Object.values(c).reduce((s, v) => s + (Number.isFinite(Number(v)) ? Number(v) : 0), 0);
  return (
    Number(report?.deficiencies ?? 0) +
    Number(report?.recommendations ?? 0) +
    Number(report?.findings ?? 0) +
    Number(report?.observations ?? 0) +
    Number(report?.other ?? 0)
  );
}
function applyInspectionSort(list, sort = {}) {
  const { key = "date", dir = "desc" } = sort;
  const d = dir === "asc" ? 1 : -1;
  const cmp = (x, y) => String(x || "").localeCompare(String(y || ""));
  const out = [...list];
  out.sort((a, b) => {
    if (key === "date") return d * cmp(a.date, b.date);
    if (key === "vessel") return d * cmp(a.vessel, b.vessel);
    if (key === "inspection_type") return d * _typeDisplay(a).localeCompare(_typeDisplay(b));
    if (key === "place") return d * cmp(a.place, b.place);
    if (key === "finding_type") return d * cmp(a.finding_type, b.finding_type);
    if (key === "code") return d * cmp(a.code, b.code);
    if (key === "detention") return d * (Number(Boolean(a.detention)) - Number(Boolean(b.detention)));
    if (key === "counts") return d * (_sumCounts(a) - _sumCounts(b));
    return d * cmp(a.date, b.date);
  });
  return out;
}

export async function listInspectionsPage({ cursor = null, limit = DEFAULT_PAGE_SIZE, filters = {}, sort = {} } = {}) {
  const all = await inspCache.load();
  return paginate(applyInspectionSort(applyInspectionFilters(all, filters), sort), cursor, limit);
}
export async function listInspectionsAll({ filters = {}, sort = {} } = {}) {
  const all = await inspCache.load();
  return applyInspectionSort(applyInspectionFilters(all, filters), sort);
}
export async function createInspection(input) {
  const saved = await request("POST", "/inspections", inspToBE(input));
  inspCache.invalidate();
  return inspFromBE(saved);
}
export async function updateInspection(id, input) {
  const saved = await request("PUT", `/inspections/${id}`, inspToBE(input));
  inspCache.invalidate();
  return inspFromBE(saved);
}
export async function deleteInspection(id) {
  await request("DELETE", `/inspections/${id}`);
  inspCache.invalidate();
  return true;
}

// ==========================================================================
// INSPECTION REPORTS
// ==========================================================================
function reportFromBE(r) {
  if (!r) return r;
  return {
    id: r.id != null ? String(r.id) : r.id,
    date: r.date ?? "",
    vessel: r.vessel ?? "",
    inspection_type: r.typeOfInspection ?? "",
    psc_authority: r.pscAuthority ?? "",
    flag_state: r.flagState ?? "",
    inspector_name: r.inspectorName ?? "",
    place: r.placeOfInspection ?? "",
    detention: !!r.detention,
    cost: r.cost != null ? Number(r.cost) : 0,
    validity_months: r.validity != null ? Number(r.validity) : 0,
    notes: r.notes ?? "",
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
    counts: (r.counts && typeof r.counts === "object") ? r.counts : {},
  };
}

function reportToBE(r) {
  const type = (r?.inspection_type || "").toLowerCase(); // ← ΠΡΟΣΘΗΚΗ
  const isPSC = type === "psc";                          // ← ΠΡΟΣΘΗΚΗ
  const isFlag = type === "flag";                        // ← ΠΡΟΣΘΗΚΗ

  return {
    date: nullIfEmpty(r?.date),
    vessel: nullIfEmpty(r?.vessel),
    typeOfInspection: nullIfEmpty(r?.inspection_type),
    pscAuthority: nullIfEmpty(r?.psc_authority),
    flagState: nullIfEmpty(r?.flag_state),
    inspectorName: nullIfEmpty(r?.inspector_name),
    placeOfInspection: nullIfEmpty(r?.place),
    detention: (isPSC || isFlag) ? !!r?.detention : null,  // ← ΑΛΛΑΓΗ
    cost: r?.cost != null && r.cost !== "" ? Number(r.cost) : null,
    validity: r?.validity_months != null && r.validity_months !== "" ? Number(r.validity_months) : null,
    notes: nullIfEmpty(r?.notes),
    attachments: Array.isArray(r?.attachments) ? r.attachments : [],
    counts: (r?.counts && typeof r.counts === "object") ? r.counts : {},
  };
}

const reportCache = makeListCache(async () => {
  const list = await request("GET", "/inspection-reports");
  return (list || []).map(reportFromBE);
});

export async function listInspectionReports() {
  return reportCache.load();
}

const REPORT_HAYSTACK_EXTRA = ["detention", "cost", "total_cost", "validity_months"];

export async function listInspectionReportsPage({ cursor = null, limit = DEFAULT_PAGE_SIZE, filters = {}, sort = {} } = {}) {
  const all = await reportCache.load();
  return paginate(
    applyInspectionSort(applyInspectionFilters(all, filters, REPORT_HAYSTACK_EXTRA), sort),
    cursor,
    limit
  );
}
export async function listInspectionReportsAll({ filters = {}, sort = {} } = {}) {
  const all = await reportCache.load();
  return applyInspectionSort(applyInspectionFilters(all, filters, REPORT_HAYSTACK_EXTRA), sort);
}
export async function createInspectionReport(input) {
  const saved = await request("POST", "/inspection-reports", reportToBE(input));
  reportCache.invalidate();
  return reportFromBE(saved);
}
export async function updateInspectionReport(id, input) {
  const saved = await request("PUT", `/inspection-reports/${id}`, reportToBE(input));
  reportCache.invalidate();
  return reportFromBE(saved);
}
export async function deleteInspectionReport(id) {
  await request("DELETE", `/inspection-reports/${id}`);
  reportCache.invalidate();
  return true;
}

// ==========================================================================
// DIRECTORY CONTACTS
// ==========================================================================
function contactFromBE(c) {
  if (!c) return c;
  return {
    id: c.id != null ? String(c.id) : c.id,
    full_name: c.name ?? "",
    short_id: c.shortIdentifier ?? "",
    department: c.department ?? "",
    business_phone: c.businessPhone ?? "",
    personal_phone: c.personalPhone ?? "",
    extension: c.extension ?? "",
    vessels: Array.isArray(c.assignedVessels) ? c.assignedVessels : [],
  };
}
function contactToBE(c) {
  return {
    name: c?.full_name ?? "",
    shortIdentifier: nullIfEmpty(c?.short_id),
    department: nullIfEmpty(c?.department),
    businessPhone: nullIfEmpty(c?.business_phone),
    personalPhone: nullIfEmpty(c?.personal_phone),
    extension: nullIfEmpty(c?.extension),
    assignedVessels: Array.isArray(c?.vessels) ? uniq(c.vessels) : [],
  };
}

const contactCache = makeListCache(async () => {
  const list = await request("GET", "/contacts");
  return (list || []).map(contactFromBE);
});

export async function listDirectoryContacts() {
  return contactCache.load();
}
export async function createDirectoryContact(input) {
  const saved = await request("POST", "/contacts", contactToBE(input));
  contactCache.invalidate();
  return contactFromBE(saved);
}
export async function updateDirectoryContact(id, input) {
  const saved = await request("PUT", `/contacts/${id}`, contactToBE(input));
  contactCache.invalidate();
  return contactFromBE(saved);
}
export async function deleteDirectoryContact(id) {
  await request("DELETE", `/contacts/${id}`);
  contactCache.invalidate();
  return true;
}

// ==========================================================================
// TASKS
// --------------------------------------------------------------------------
// The backend Task DTO is simpler than the frontend's task model:
//   FE                                BE
//   --                                --
//   vessels[]                  ↔     vessel              (single value)
//   assigned_to[]              ↔     assignedTo          (single value)
//   important                  ↔     importantSwitch
//   add_to_my_day              ↔     addToMyDaySwitch
//   due_date  (YYYY-MM-DD)     ↔     dueDate (LocalDate)
//   reminder_at (ISO datetime) ↔     reminder (LocalDateTime)
//   steps  ([{id,text,done}])  ↔     steps ([String])
//
// Fields that have NO backend column today and therefore would be lost on a
// round-trip: status, created_at, created_by, visible_to_assignee, pinned.
// We default them sensibly when reading from the backend.
// ==========================================================================
function _stepsFromBE(steps) {
  if (!Array.isArray(steps)) return [];
  return steps.map((s, idx) => {
    if (s && typeof s === "object") {
      return {
        id: s.id != null ? String(s.id) : `s_${idx}`,
        text: String(s.text ?? ""),
        done: !!s.done,
      };
    }
    return { id: `s_${idx}`, text: String(s ?? ""), done: false };
  });
}
function _stepsToBE(steps) {
  if (!Array.isArray(steps)) return [];
  return steps
    .map((s) => (s && typeof s === "object" ? String(s.text ?? "") : String(s ?? "")))
    .filter((t) => t.trim() !== "");
}
function taskFromBE(t) {
  if (!t) return t;
  return {
    id: t.id != null ? String(t.id) : t.id,
    title: t.title ?? "",
    steps: _stepsFromBE(t.steps),
    important: !!t.importantSwitch,
    add_to_my_day: !!t.addToMyDaySwitch,
    vessels: t.vessel ? [t.vessel] : [],
    assigned_to: t.assignedTo ? [t.assignedTo] : [],
    visible_to_assignee: !!t.assignedTo, // best-effort default
    due_date: t.dueDate ?? "",
    reminder_at: t.reminder ?? "",
    notes: t.notes ?? "",
    attachments: Array.isArray(t.attachments) ? t.attachments : [],
    // No backend column → derived defaults
    status: "Open",
    created_at: "",
    created_by: "",
  };
}
function taskToBE(t) {
  return {
    title: t?.title ?? "",
    steps: _stepsToBE(t?.steps),
    importantSwitch: !!t?.important,
    addToMyDaySwitch: !!t?.add_to_my_day,
    vessel: Array.isArray(t?.vessels) && t.vessels[0] ? t.vessels[0] : nullIfEmpty(t?.vessel),
    assignedTo:
      Array.isArray(t?.assigned_to) && t.assigned_to[0]
        ? t.assigned_to[0]
        : nullIfEmpty(t?.assigned_to),
    dueDate: nullIfEmpty(t?.due_date),
    reminder: nullIfEmpty(t?.reminder_at),
    notes: nullIfEmpty(t?.notes),
    attachments: Array.isArray(t?.attachments) ? t.attachments : [],
  };
}

const taskCache = makeListCache(async () => {
  const list = await request("GET", "/tasks");
  return (list || []).map(taskFromBE);
});

export async function listTasks() {
  return taskCache.load();
}
export async function createTask(input) {
  const saved = await request("POST", "/tasks", taskToBE(input));
  taskCache.invalidate();
  return taskFromBE(saved);
}
export async function updateTask(id, input) {
  const saved = await request("PUT", `/tasks/${id}`, taskToBE(input));
  taskCache.invalidate();
  return taskFromBE(saved);
}
export async function deleteTask(id) {
  await request("DELETE", `/tasks/${id}`);
  taskCache.invalidate();
  return true;
}

// ==========================================================================
// AUTH / SETTINGS / USERS — no backend yet, fall back to mock so the UI
// (Layout, RequireTab, Settings page, dropdown options, etc.) keeps working.
// ==========================================================================
export const getMe = _mockGetMe;
export const setSessionEmail = _mockSetSessionEmail;
export const listUsers = _mockListUsers;
export const updateUser = _mockUpdateUser;
export const getSettings = _mockGetSettings;
export const updateSettings = _mockUpdateSettings;
