// src/utils/searchIndex.js

function norm(v) {
  return String(v ?? "").toLowerCase().trim();
}

function safeArr(v) {
  return Array.isArray(v) ? v : v ? [v] : [];
}

function scoreForFieldMatch(value, token, weights) {
  const s = norm(value);
  if (!s) return 0;
  if (s === token) return weights.exact;
  if (s.startsWith(token)) return weights.starts;
  if (s.includes(token)) return weights.contains;
  return 0;
}

// --------------------
// Deep user-filled indexing helpers
// --------------------
const DEEP_EXCLUDE_KEYS = new Set([
  "id",
  "key",
  "created_at",
  "updated_at",
  "deleted_at",
  "__v",
  "__typename",
  "route",
  "searchFields",
]);

function pushDeep(out, v) {
  if (v === null || v === undefined) return;

  // primitives
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    const s = String(v).trim();
    if (s) out.push(s);
    return;
  }

  // arrays
  if (Array.isArray(v)) {
    for (const x of v) pushDeep(out, x);
    return;
  }

  // objects
  if (typeof v === "object") {
    for (const [k, val] of Object.entries(v)) {
      const kk = String(k || "");
      if (!kk) continue;
      if (DEEP_EXCLUDE_KEYS.has(kk)) continue;

      const low = kk.toLowerCase();

      // don't index URLs / blob links / huge binary-like fields
      if (low.includes("url")) continue;
      if (low.includes("blob")) continue;

      pushDeep(out, val);
    }
  }
}

function deepTextFromRecord(record) {
  const out = [];
  pushDeep(out, record);

  // de-dup (keeps the index "clean")
  return Array.from(new Set(out));
}


/**
 * AND semantics across tokens.
 * Returns -1 if any token doesn't match anywhere.
 */
export function scoreItem(item, tokens) {
  if (!tokens || tokens.length === 0) return -1;

  const f = item.searchFields;
  let total = 0;

  for (const t of tokens) {
    let best = 0;

    for (const v of safeArr(f.primary)) {
      best = Math.max(best, scoreForFieldMatch(v, t, { exact: 90, starts: 60, contains: 40 }));
    }

    if (best === 0) {
      for (const v of safeArr(f.numbers)) {
        best = Math.max(best, scoreForFieldMatch(v, t, { exact: 55, starts: 45, contains: 35 }));
      }
    }

    if (best === 0) {
      for (const v of safeArr(f.text)) {
        best = Math.max(best, scoreForFieldMatch(v, t, { exact: 28, starts: 22, contains: 18 }));
      }
    }

    if (best === 0) {
      for (const v of safeArr(f.tags)) {
        best = Math.max(best, scoreForFieldMatch(v, t, { exact: 20, starts: 16, contains: 12 }));
      }
    }

    if (best === 0) return -1;
    total += best;
  }

  return total;
}

/**
 * Build unified index from app entities.
 * Includes Tasks Notes stored in localStorage (hsqe_notes_v1).
 * Settings excluded.
 */
export function buildSearchIndex({
  tasks,
  inspections,
  inspectionReports,
  certificates,
  contacts,
  notes, // ✅ NEW
}) {
  const items = [];

  // TASKS
  for (const t of tasks || []) {
    const vessels = safeArr(t.vessels).join(", ");
    const assigned = safeArr(t.assigned_to).join(", ");

    items.push({
      key: `task:${t.id}`,
      type: "Tasks",
      title: t.title || "Untitled task",
      subtitle: [t.status, t.due_date].filter(Boolean).join(" • "),
      route: `/tasks?focus=${encodeURIComponent(String(t.id))}&from=search`,
      searchFields: {
        primary: [t.title],
        numbers: [],
        text: [
          t.notes, // ✅ task notes
          ...(safeArr(t.steps).map((s) => s?.text || s?.title)),
        ],
        tags: [t.status, vessels, assigned],
      },
      sortDate: t.created_at || t.due_date,
    });
  }

  // TASKS → NOTES (localStorage)
  for (const n of notes || []) {
    items.push({
      key: `note:${n.id}`,
      type: "Notes",
      title: n.title || "Note",
      subtitle: [n.vessel, n.pinned ? "Pinned" : ""].filter(Boolean).join(" • "),
      route: `/tasks?section=notes&focus=${encodeURIComponent(String(n.id))}&from=search`,
      searchFields: {
        primary: [n.title, n.vessel],
        numbers: [],
        text: [n.body],
        tags: [n.color, n.pinned ? "pinned" : ""]},
      sortDate: n.updated_at || n.created_at || null,
    });
  }

  // INSPECTIONS (findings rows)
  for (const i of inspections || []) {
    const deep = deepTextFromRecord(i);
  
    items.push({
      key: `inspectionFinding:${i.id}`,
      type: "Inspections",
      title: `${i.vessel || ""} • ${i.inspection_type || "Inspection"}`.trim(),
      subtitle: [i.date, i.code, i.finding_type].filter(Boolean).join(" • "),
      route: `/inspections?tab=list&focus=${encodeURIComponent(String(i.id))}`,
      searchFields: {
        primary: [i.vessel, i.inspection_type, i.code],
        numbers: [i.code],
        text: [
          // ✅ όλα τα “κλασικά”
          i.description,
          i.place,
          i.cpa_number,
          i.corrective_action,
          i.preventive_action,
  
          // ✅ ΟΛΑ τα υπόλοιπα που έχει συμπληρώσει ο χρήστης (dropdown + dynamic)
          ...deep,
        ],
        tags: [i.psc_authority, i.flag_state, i.finding_type, i.date],
      },
      sortDate: i.date,
    });
  }


  // INSPECTION REPORTS
  for (const r of inspectionReports || []) {
    const deep = deepTextFromRecord(r);
  
    items.push({
      key: `inspectionReport:${r.id}`,
      type: "Inspections",
      title: `${r.vessel || ""} • ${r.inspection_type || "Report"}`.trim(),
      subtitle: [r.date, r.psc_authority].filter(Boolean).join(" • "),
      route: `/inspections?tab=reports&focus=${encodeURIComponent(String(r.id))}`,
      searchFields: {
        primary: [r.vessel, r.inspection_type, r.psc_authority],
        numbers: [r.deficiencies, r.observations, r.findings, r.recommendations, r.other, r.cost, r.total_cost],
        text: [
          r.notes,
          r.place,
          r.inspector_name,
          r.master,
          r.chief_engineer,
  
          // ✅ all user-filled fields, counts object, validity_months, etc.
          ...deep,
        ],
        tags: [r.detention ? "detention" : "", r.flag_state],
      },
      sortDate: r.date,
    });
  }

  // CERTIFICATES
  for (const c of certificates || []) {
    items.push({
      key: `certificate:${c.id}`,
      type: "Certificates",
      title: c.certificate_name || "Certificate",
      subtitle: [c.vessel, c.certificate_code, c.to_date].filter(Boolean).join(" • "),
      route: `/certificates?focus=${encodeURIComponent(String(c.id))}&from=search`,
      searchFields: {
        primary: [c.certificate_name, c.vessel, c.type],
        numbers: [c.certificate_code],
        text: [c.notes], // ✅ certificate notes
        tags: [c.status, c.from_date, c.to_date],
      },
      sortDate: c.to_date || c.from_date,
    });
  }

  // DIRECTORY
  for (const p of contacts || []) {
    const vessels = safeArr(p.vessels).join(", ");
    items.push({
      key: `contact:${p.id}`,
      type: "Directory",
      title: p.full_name || "Contact",
      subtitle: [p.short_id, p.department].filter(Boolean).join(" • "),
      route: `/directory?focus=${encodeURIComponent(String(p.id))}`,
      searchFields: {
        primary: [p.full_name, p.short_id],
        numbers: [p.business_phone, p.personal_phone, p.extension],
        text: [p.notes], // ✅ if you add notes to contacts in the future, they'll be included
        tags: [p.department, vessels],
      },
      sortDate: null,
    });
  }

  return items;
}

export function groupResults(scoredItems, perGroupLimit = 7) {
  const groups = new Map();
  for (const it of scoredItems) {
    const arr = groups.get(it.type) || [];
    arr.push(it);
    groups.set(it.type, arr);
  }

  const ordered = Array.from(groups.entries())
    .map(([type, arr]) => ({ type, top: arr[0]?.score || 0, items: arr.slice(0, perGroupLimit) }))
    .sort((a, b) => b.top - a.top);

  return ordered;
}
