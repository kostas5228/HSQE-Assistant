// src/mock/api.js
import {
  mockUser,
  mockUsers,
  mockTasks,
  mockInspections,
  mockInspectionReports,
  mockCertificates,
  mockDirectoryContacts,
  mockSettings,
} from "./data";

// --------------------
// Helpers
// --------------------
function delay(ms = 300) {
  return new Promise((res) => setTimeout(res, ms));
}

function publicUsersForDropdown() {
  return users.map(({ email, full_name }) => ({ email, full_name }));
}


function genId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function isVettingType(t) {
  return String(t || "").trim().toLowerCase() === "vetting";
}

function normEmail(v) {
  return String(v || "").trim().toLowerCase();
}

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function intersect(a, b) {
  const s = new Set(a || []);
  return (b || []).some((x) => s.has(x));
}

function userAllowedVessels(me) {
  const vessels = me?.permissions?.vessels;
  if (!Array.isArray(vessels) || vessels.length === 0) return ["ALL"];
  return uniq(vessels);
}

function hasAllVessels(me) {
  const v = userAllowedVessels(me);
  return v.includes("ALL");
}

function filterByVesselField(items, me, getVessel) {
  if (!me) return [...items];
  if (me.is_admin) return [...items];

  const allowed = userAllowedVessels(me);
  if (allowed.includes("ALL")) return [...items];

  return items.filter((it) => {
    const vessel = getVessel(it);
    if (!vessel) return true; // αν δεν έχει vessel, μην το κόβουμε
    return allowed.includes(vessel);
  });
}

function filterByVesselsArrayField(items, me, getVessels) {
  if (!me) return [...items];
  if (me.is_admin) return [...items];

  const allowed = userAllowedVessels(me);
  if (allowed.includes("ALL")) return [...items];

  return items.filter((it) => {
    const vessels = Array.isArray(getVessels(it)) ? getVessels(it) : [];
    if (vessels.length === 0) return true; // αν δεν έχει vessels, μην το κόβουμε
    return intersect(allowed, vessels);
  });
}

// --------------------
// Pagination helpers
// --------------------
//
// We use an opaque string cursor that, in this mock, encodes a numeric offset.
// In a real backend this would be e.g. a base64-encoded keyset cursor
// (id+sortKey) so the database can do `WHERE (sortKey, id) > (?, ?) LIMIT N`
// without OFFSET scans. The contract from the client's point of view is the
// same: pass back whatever `nextCursor` came in the previous page; `null`
// means "no more pages".
const DEFAULT_PAGE_SIZE = 30;

function paginate(items, cursor, limit = DEFAULT_PAGE_SIZE) {
  const start = cursor ? Math.max(0, Number(cursor) || 0) : 0;
  const end = start + Math.max(1, Number(limit) || DEFAULT_PAGE_SIZE);
  const slice = items.slice(start, end);
  const nextStart = start + slice.length;
  const nextCursor = nextStart < items.length ? String(nextStart) : null;
  return {
    items: slice,
    nextCursor,
    total: items.length,
  };
}

// --- Inspection / Report shared search helpers (mirror UI behavior) ---
function _queryTokens(q) {
  return String(q || "")
    .toLowerCase()
    .split(/[\s,]+/g)
    .map((t) => t.trim())
    .filter(Boolean);
}

function _haystack(obj, extraKeys = []) {
  const keys = [
    "date",
    "vessel",
    "inspection_type",
    "psc_authority",
    "flag_state",
    "place",
    "finding_type",
    "code",
    "cpa_number",
    "description",
    "corrective_action",
    "preventive_action",
    "inspector_name",
    "master",
    "chief_engineer",
    "notes",
    ...extraKeys,
  ];
  return keys
    .map((k) => (obj?.[k] ?? "").toString())
    .join(" ")
    .toLowerCase();
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

function applyInspectionFilters(list, filters = {}, extraHaystackKeys = []) {
  const { vessels = [], types = [], tab = "search", q = "", from = "", to = "" } = filters;
  let out = [...list];

  if (Array.isArray(vessels) && vessels.length > 0) {
    out = out.filter((x) => x.vessel && vessels.includes(x.vessel));
  }
  if (Array.isArray(types) && types.length > 0) {
    out = out.filter(
      (x) => (x.inspection_type || "") && types.includes(x.inspection_type)
    );
  }

  if (tab === "search") {
    const tokens = _queryTokens(q);
    if (tokens.length > 0) {
      out = out.filter((x) => {
        const hay = _haystack(x, extraHaystackKeys);
        return tokens.every((t) => hay.includes(t));
      });
    }
  } else {
    out = out.filter((x) => _withinDate(x, from, to));
  }

  return out;
}

function _sumCounts(report) {
  const c =
    report?.counts && typeof report.counts === "object" ? report.counts : null;
  if (c) {
    return Object.values(c).reduce(
      (s, v) => s + (Number.isFinite(Number(v)) ? Number(v) : 0),
      0
    );
  }
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
    if (key === "detention")
      return d * (Number(Boolean(a.detention)) - Number(Boolean(b.detention)));
    if (key === "counts") return d * (_sumCounts(a) - _sumCounts(b));
    return d * cmp(a.date, b.date);
  });
  return out;
}

// --- Certificates filter+sort helpers (mirror UI) ---
function _safeDate(s) {
  if (!s) return null;
  const t = new Date(s);
  return Number.isNaN(t.getTime()) ? null : t;
}

function _startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function _computeCertStatus(c, dueWindowDays = 120) {
  const to = _safeDate(c?.to_date);
  if (!to) return "valid";
  const today = _startOfToday();
  const diffDays = Math.ceil((to.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays <= dueWindowDays) return "due";
  return "ok";
}

function applyCertificateFilters(list, filters = {}) {
  const {
    search = "",
    vesselsSelected = [],
    typesSelected = [],
    status = "all",
  } = filters;

  const q = String(search || "").trim().toLowerCase();

  return list.filter((c) => {
    if (q) {
      const hay = `${c.vessel || ""} ${c.certificate_code || ""} ${c.certificate_name || ""} ${c.type || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (vesselsSelected.length && !vesselsSelected.includes(c.vessel)) return false;
    if (typesSelected.length && !typesSelected.includes(c.type)) return false;
    if (status !== "all") {
      const s = _computeCertStatus(c, 120);
      if (s !== status) return false;
    }
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
    if (key === "status") {
      return d * cmp(_computeCertStatus(a, 120), _computeCertStatus(b, 120));
    }
    return d * cmp(a.to_date, b.to_date);
  });
  return out;
}

// --------------------
// "DB" (in-memory)
// --------------------
let settings = mockSettings ? { ...mockSettings } : {};
let certificates = Array.isArray(mockCertificates) ? [...mockCertificates] : [];
let directoryContacts = Array.isArray(mockDirectoryContacts) ? [...mockDirectoryContacts] : [];
let tasks = Array.isArray(mockTasks) ? [...mockTasks] : [];
let inspections = Array.isArray(mockInspections) ? [...mockInspections] : [];
let inspectionReports = Array.isArray(mockInspectionReports) ? [...mockInspectionReports] : [];
let users = Array.isArray(mockUsers) ? [...mockUsers] : [];

// Active session user (simulate login)
let sessionUser = { ...(mockUser || {}) };

// Get "me" fully (merge from users list)
function getSessionMeSync() {
  const email = normEmail(sessionUser?.email);
  const found = users.find((u) => normEmail(u.email) === email);

  // If not found in users, still return sessionUser shape
  const base = found ? { ...found } : { ...sessionUser };

  // Admin: always ALL vessels
  const isAdmin = Boolean(base?.is_admin);
  const perms = base?.permissions || {};
  const vessels = isAdmin ? ["ALL"] : (Array.isArray(perms?.vessels) ? perms.vessels : ["ALL"]);

  return {
    ...base,
    is_admin: isAdmin,
    permissions: {
      ...(perms || {}),
      tabs: { ...(perms?.tabs || {}) },
      vessels: uniq(vessels.length ? vessels : ["ALL"]),
    },
  };
}

// --------------------
// AUTH / ME
// --------------------
export async function getMe() {
  await delay();
  return { ...getSessionMeSync() };
}

// (optional helper) change session user in dev
export async function setSessionEmail(email) {
  await delay();
  sessionUser = { ...sessionUser, email: String(email || "").trim() };
  return { ...getSessionMeSync() };
}

// --------------------
// USERS (admin edits these)
// --------------------
export async function listUsers() {
  await delay();

  const me = getSessionMeSync();
  if (!me?.is_admin) return []; // non-admin never sees users list

  // ensure admin always ALL in output
  return users.map((u) => {
    const isAdmin = Boolean(u?.is_admin);
    const perms = u?.permissions || {};
    const vessels = isAdmin ? ["ALL"] : (Array.isArray(perms?.vessels) ? perms.vessels : ["ALL"]);

    return {
      ...u,
      is_admin: isAdmin,
      permissions: {
        ...(perms || {}),
        tabs: { ...(perms?.tabs || {}) },
        vessels: uniq(vessels.length ? vessels : ["ALL"]),
      },
    };
  });
}

export async function updateUser(email, input) {
  await delay();

  const me = getSessionMeSync();
  if (!me?.is_admin) throw new Error("Not allowed");

  const e = normEmail(email);
  users = users.map((u) => {
    if (normEmail(u.email) !== e) return u;

    const next = { ...u, ...(input || {}) };

    const isAdmin = Boolean(next?.is_admin);
    const perms = next?.permissions || {};
    const vesselsRaw = Array.isArray(perms?.vessels) ? perms.vessels : ["ALL"];
    const vessels = isAdmin ? ["ALL"] : uniq(vesselsRaw.length ? vesselsRaw : ["ALL"]);

    return {
      ...next,
      is_admin: isAdmin,
      permissions: {
        ...(perms || {}),
        tabs: { ...(perms?.tabs || {}) },
        vessels,
      },
    };
  });

  // ✅ (C) SYNC settings.users AFTER users updated
  settings = { ...settings, users: publicUsersForDropdown() };

  // If I updated the currently logged-in user, getMe() should reflect it
  const updated = users.find((u) => normEmail(u.email) === e);
  return updated ? { ...updated } : null;
}

// --------------------
// SETTINGS
// --------------------
export async function getSettings() {
  await delay();
  return {
    ...settings,
    users: publicUsersForDropdown(),
  };
}

export async function updateSettings(input) {
  await delay();
  const me = getSessionMeSync();
  if (!me?.is_admin) throw new Error("Not allowed"); // μόνο admin αλλάζει dropdowns
  settings = { ...settings, ...(input || {}) };
  return { ...settings };
}

// --------------------
// CERTIFICATES
// --------------------
export async function listCertificates() {
  await delay();
  const me = getSessionMeSync();
  return filterByVesselField(certificates, me, (c) => c?.vessel);
}

/**
 * Cursor-paginated certificates with server-side filtering + sorting.
 * Pass the same `cursor` you got back as `nextCursor` from the previous page.
 *
 * @param {{ cursor?: string|null, limit?: number, filters?: object, sort?: object }} args
 * @returns {{ items: any[], nextCursor: string|null, total: number }}
 */
export async function listCertificatesPage({
  cursor = null,
  limit = DEFAULT_PAGE_SIZE,
  filters = {},
  sort = {},
} = {}) {
  await delay();
  const me = getSessionMeSync();
  const visible = filterByVesselField(certificates, me, (c) => c?.vessel);
  const filtered = applyCertificateFilters(visible, filters);
  const sorted = applyCertificateSort(filtered, sort);
  return paginate(sorted, cursor, limit);
}

/**
 * Same filters/sort as `listCertificatesPage` but returns ALL matching rows
 * (no pagination). Used by exports / bulk operations only.
 */
export async function listCertificatesAll({ filters = {}, sort = {} } = {}) {
  await delay();
  const me = getSessionMeSync();
  const visible = filterByVesselField(certificates, me, (c) => c?.vessel);
  const filtered = applyCertificateFilters(visible, filters);
  return applyCertificateSort(filtered, sort);
}

export async function createCertificate(input) {
  await delay();
  const me = getSessionMeSync();
  const item = { id: genId("c"), ...(input || {}) };
  certificates.unshift(item);
  return item;
}

export async function updateCertificate(id, input) {
  await delay();
  certificates = certificates.map((c) => (c.id === id ? { ...c, ...(input || {}) } : c));
  return certificates.find((c) => c.id === id);
}

export async function deleteCertificate(id) {
  await delay();
  certificates = certificates.filter((c) => c.id !== id);
  return true;
}

// --------------------
// DIRECTORY CONTACTS
// --------------------
export async function listDirectoryContacts() {
  await delay();
  const me = getSessionMeSync();
  return filterByVesselsArrayField(directoryContacts, me, (c) => c?.vessels);
}

export async function createDirectoryContact(input) {
  await delay();
  const item = { id: genId("dc"), ...(input || {}) };
  directoryContacts.unshift(item);
  return item;
}

export async function updateDirectoryContact(id, input) {
  await delay();
  directoryContacts = directoryContacts.map((c) => (c.id === id ? { ...c, ...(input || {}) } : c));
  return directoryContacts.find((c) => c.id === id);
}

export async function deleteDirectoryContact(id) {
  await delay();
  directoryContacts = directoryContacts.filter((c) => c.id !== id);
  return true;
}

// --------------------
// TASKS (private: own + assigned) + vessels enforcement
// --------------------
export async function listTasks() {
  await delay();
  const me = getSessionMeSync();
  const email = normEmail(me?.email);

 // own + (assigned ONLY IF visible_to_assignee === true)
let list = tasks.filter((t) => {
  const createdBy = normEmail(t?.created_by);
  if (createdBy === email) return true; // creator always sees it

  const canAssigneeSee = !!t?.visible_to_assignee;
  if (!canAssigneeSee) return false;

  const assigned = Array.isArray(t?.assigned_to) ? t.assigned_to.map(normEmail) : [];
  return assigned.includes(email);
});

  // vessels enforcement (if not ALL, must intersect)
  if (!me?.is_admin && !hasAllVessels(me)) {
    const allowed = userAllowedVessels(me);
    list = list.filter((t) => {
      const vv = Array.isArray(t?.vessels) ? t.vessels : [];
      if (vv.length === 0) return true;
      return intersect(allowed, vv);
    });
  }

  return [...list];
}

export async function createTask(input) {
  await delay();
  const me = getSessionMeSync();

  const item = {
    id: genId("t"),
    title: input?.title ?? "",
    status: input?.status ?? "Open",
    created_at: input?.created_at ?? new Date().toISOString(),
    due_date: input?.due_date ?? "",
    reminder_at: input?.reminder_at ?? "",
    important: !!input?.important,
    add_to_my_day: !!input?.add_to_my_day,
    vessels: Array.isArray(input?.vessels) ? input.vessels : [],
    notes: input?.notes ?? "",
    steps: Array.isArray(input?.steps) ? input.steps : [],
    assigned_to: Array.isArray(input?.assigned_to) ? input.assigned_to : [],
    created_by: input?.created_by || me?.email,
    visible_to_assignee: !!input?.visible_to_assignee,
  };

  tasks.unshift(item);
  return item;
}


export async function updateTask(id, input) {
  await delay();
  tasks = tasks.map((t) => (t.id === id ? { ...t, ...(input || {}) } : t));
  return tasks.find((t) => t.id === id);
}

export async function deleteTask(id) {
  await delay();
  tasks = tasks.filter((t) => t.id !== id);
  return true;
}

// --------------------
// INSPECTIONS (Findings)
// --------------------
export async function listInspections() {
  await delay();
  const me = getSessionMeSync();
  return filterByVesselField(inspections, me, (x) => x?.vessel);
}

/**
 * Cursor-paginated Inspections (Findings) with server-side filter + sort.
 */
export async function listInspectionsPage({
  cursor = null,
  limit = DEFAULT_PAGE_SIZE,
  filters = {},
  sort = {},
} = {}) {
  await delay();
  const me = getSessionMeSync();
  const visible = filterByVesselField(inspections, me, (x) => x?.vessel);
  const filtered = applyInspectionFilters(visible, filters);
  const sorted = applyInspectionSort(filtered, sort);
  return paginate(sorted, cursor, limit);
}

export async function listInspectionsAll({ filters = {}, sort = {} } = {}) {
  await delay();
  const me = getSessionMeSync();
  const visible = filterByVesselField(inspections, me, (x) => x?.vessel);
  const filtered = applyInspectionFilters(visible, filters);
  return applyInspectionSort(filtered, sort);
}

export async function createInspection(input) {
  await delay();
  const item = { id: genId("i"), ...(input || {}) };
  inspections.unshift(item);
  return item;
}

export async function updateInspection(id, input) {
  await delay();
  inspections = inspections.map((x) => (x.id === id ? { ...x, ...(input || {}) } : x));
  return inspections.find((x) => x.id === id);
}

export async function deleteInspection(id) {
  await delay();
  inspections = inspections.filter((x) => x.id !== id);
  return true;
}

// --------------------
// INSPECTION REPORTS
// --------------------
export async function listInspectionReports() {
  await delay();
  const me = getSessionMeSync();
  return filterByVesselField(inspectionReports, me, (r) => r?.vessel);
}

const REPORT_HAYSTACK_EXTRA = ["detention", "cost", "total_cost", "validity_months"];

/**
 * Cursor-paginated Inspection Reports with server-side filter + sort.
 */
export async function listInspectionReportsPage({
  cursor = null,
  limit = DEFAULT_PAGE_SIZE,
  filters = {},
  sort = {},
} = {}) {
  await delay();
  const me = getSessionMeSync();
  const visible = filterByVesselField(inspectionReports, me, (r) => r?.vessel);
  const filtered = applyInspectionFilters(visible, filters, REPORT_HAYSTACK_EXTRA);
  const sorted = applyInspectionSort(filtered, sort);
  return paginate(sorted, cursor, limit);
}

export async function listInspectionReportsAll({ filters = {}, sort = {} } = {}) {
  await delay();
  const me = getSessionMeSync();
  const visible = filterByVesselField(inspectionReports, me, (r) => r?.vessel);
  const filtered = applyInspectionFilters(visible, filters, REPORT_HAYSTACK_EXTRA);
  return applyInspectionSort(filtered, sort);
}

export async function createInspectionReport(input) {
  await delay();

  const vetting = isVettingType(input?.inspection_type);

  const item = {
    id: genId("r"),
    ...(input || {}),
    validity_months: vetting ? Number(input?.validity_months ?? 0) : undefined,
  };

  inspectionReports.unshift(item);
  return item;
}

export async function updateInspectionReport(id, input) {
  await delay();

  inspectionReports = inspectionReports.map((r) => {
    if (r.id !== id) return r;

    const nextType = input?.inspection_type ?? r?.inspection_type;
    const vetting = isVettingType(nextType);

    return {
      ...r,
      ...(input || {}),
      validity_months: vetting
        ? Number(input?.validity_months ?? r?.validity_months ?? 0)
        : undefined,
    };
  });

  return inspectionReports.find((r) => r.id === id);
}

export async function deleteInspectionReport(id) {
  await delay();
  inspectionReports = inspectionReports.filter((r) => r.id !== id);
  return true;
}
