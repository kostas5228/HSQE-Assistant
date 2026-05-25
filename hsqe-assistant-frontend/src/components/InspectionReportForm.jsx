// ../components/InspectionReportForm.jsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "../api";
import { Paperclip, Trash2, Plus, ChevronDown, X } from "lucide-react";


function randLocalId() {
  return `att_${Math.floor(Math.random() * 1000000)}_${Date.now()}`;
}

function keyFromType(type) {
  const t = String(type || "").toLowerCase();
  if (t === "deficiency" || t === "deficiencies") return "deficiencies";
  if (t === "recommendation" || t === "recommendations") return "recommendations";
  if (t === "finding" || t === "findings") return "findings";
  if (t === "observation" || t === "observations") return "observations";
  if (t === "other") return "other";
  return null;
}

function normalizeCountsToFlat(countsObj) {
  const flat = { deficiencies: 0, recommendations: 0, findings: 0, observations: 0, other: 0 };
  for (const [k, v] of Object.entries(countsObj || {})) {
    const fk = keyFromType(k);
    if (!fk) continue;
    flat[fk] += Number(v || 0);
  }
  return flat;
}

function toMoneyNumber(v) {
  const s = String(v ?? "").trim();
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function alphaSort(a, b) {
  return String(a || "").localeCompare(String(b || ""), undefined, { sensitivity: "base" });
}

function isOtherLabel(x) {
  return String(x || "").trim().toLowerCase() === "other";
}

export default function InspectionReportForm({ initial = {}, onCancel, onSave, saving, onDraftChange }) {
  const { data: settings = {} } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  // ✅ options from Settings (NO mocks)
  const vessels = Array.isArray(settings?.vessels) ? settings.vessels : [];
  const inspectionTypesRaw = Array.isArray(settings?.inspectionTypes) ? settings.inspectionTypes : [];
  const pscAuthorities = Array.isArray(settings?.pscAuthorities) ? settings.pscAuthorities : [];
  const flagStates = Array.isArray(settings?.flagStates) ? settings.flagStates : [];
  const findingTypes = Array.isArray(settings?.findingTypes) ? settings.findingTypes : [];

  const initialCounts =
    initial.counts && typeof initial.counts === "object"
      ? { ...initial.counts }
      : {
          ...(Number(initial.deficiencies ?? 0) ? { Deficiency: Number(initial.deficiencies ?? 0) } : {}),
          ...(Number(initial.recommendations ?? 0) ? { Recommendation: Number(initial.recommendations ?? 0) } : {}),
          ...(Number(initial.findings ?? 0) ? { Finding: Number(initial.findings ?? 0) } : {}),
          ...(Number(initial.observations ?? 0) ? { Observation: Number(initial.observations ?? 0) } : {}),
        };


  const [form, setForm] = React.useState({
    date: initial.date || "",
    vessel: initial.vessel || "",

    inspection_type: initial.inspection_type ?? "",
    psc_authority: initial.psc_authority || "",

    place: initial.place || "",

    flag_state: initial.flag_state || "",
    inspector_name: initial.inspector_name || "",

    detention: !!initial.detention,
    cost:
      initial.cost !== undefined && initial.cost !== null && String(initial.cost).trim() !== ""
        ? String(initial.cost)
        : "",

    // ✅ NEW: validity (months) for Vetting only
    validity_months:
      initial.validity_months !== undefined && initial.validity_months !== null && String(initial.validity_months) !== ""
        ? String(initial.validity_months)
        : "0",

    notes: initial.notes || "",
    attachments: Array.isArray(initial.attachments) ? initial.attachments : [],
    counts: initialCounts,
  });

  const type = String(form.inspection_type || "").toLowerCase();
  const isPSC = type === "psc";
  const isFlag = type === "flag";
  const isVetting = type === "vetting";

  const showSecondRow = isPSC || isFlag;
  const detentionAllowed = isPSC || isFlag;

  const [showInspector, setShowInspector] = React.useState(!!String(initial.inspector_name || "").trim());

  // Notify parent so a draft can be persisted across navigation.
  // Skip the very first call so we don't persist an empty/initial draft.
  const draftFirstRef = React.useRef(true);
  React.useEffect(() => {
    if (draftFirstRef.current) {
      draftFirstRef.current = false;
      return;
    }
    onDraftChange?.(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  function setField(key, value) {
    setForm((p) => {
      const next = { ...p, [key]: value };

      if (key === "inspection_type") {
        const t = String(value || "").toLowerCase();
        const psc = t === "psc";
        const flag = t === "flag";
        const vet = t === "vetting";

        if (!psc) next.psc_authority = "";
        if (!flag) next.flag_state = "";

        if (!(flag || vet)) {
          next.inspector_name = "";
        }

        if (!(psc || flag)) {
          next.detention = false;
        }

        // ✅ validity only for vetting
        if (!vet) next.validity_months = "0";
      }

      return next;
    });
  }

  function setCount(typeKey, raw) {
    const str = String(raw ?? "");
    if (str.trim() === "") {
      setForm((p) => ({ ...p, counts: { ...(p.counts || {}), [typeKey]: "" } }));
      return;
    }
    const cleaned = str.replace(/[^\d]/g, "");
    const v = Math.max(0, Number(cleaned || 0));
    setForm((p) => ({ ...p, counts: { ...(p.counts || {}), [typeKey]: v } }));
  }

  function removeCount(typeKey) {
    setForm((p) => {
      const next = { ...(p.counts || {}) };
      delete next[typeKey];
      return { ...p, counts: next };
    });
  }

  function addCountType(typeKey) {
    setForm((p) => {
      const next = { ...(p.counts || {}) };
      if (!(typeKey in next)) next[typeKey] = "";
      return { ...p, counts: next };
    });
  }

  function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const next = files.map((f) => ({
      id: randLocalId(),
      name: f.name,
      size: f.size,
      type: f.type || "file",
      url: URL.createObjectURL(f),
      uploaded_at: new Date().toISOString(),
    }));

    setForm((p) => ({ ...p, attachments: [...p.attachments, ...next] }));
  }

  function removeAttachment(id) {
    setForm((p) => {
      const att = p.attachments.find((a) => a.id === id);
      if (att?.url && String(att.url).startsWith("blob:")) {
        try {
          URL.revokeObjectURL(att.url);
        } catch {}
      }
      return { ...p, attachments: p.attachments.filter((a) => a.id !== id) };
    });
  }

  function submit(e) {
    e.preventDefault();

    const countsObj = form.counts || {};
    const normalizedCounts = {};
    for (const [k, v] of Object.entries(countsObj)) {
      if (isOtherLabel(k)) continue; // ✅ μην στέλνεις Other καθόλου
      normalizedCounts[k] = v === "" ? 0 : Number(v || 0);
    }


    const flat = normalizeCountsToFlat(normalizedCounts);

    const payload = {
      ...form,

      // ✅ Ensure numeric validity for vetting only
      validity_months: isVetting ? Number(form.validity_months || 0) : undefined,

      counts: normalizedCounts,
      ...flat,

      attachments: Array.isArray(form.attachments) ? form.attachments : [],

      detention: detentionAllowed ? !!form.detention : false,
      cost: toMoneyNumber(form.cost),

      psc_authority: isPSC ? form.psc_authority : "",
      flag_state: isFlag ? form.flag_state : "",
      inspector_name: showInspector && (isFlag || isVetting) ? String(form.inspector_name || "").trim() : "",
      place: String(form.place || "").trim(),
    };

    onSave?.(payload);
  }

  const ui = {
    input: {
      height: 42,
      borderRadius: 10,
      border: "1px solid #e5e7eb",
      padding: "0 12px",
      background: "white",
      outline: "none",
      fontWeight: 800,
      color: "#0f172a",
      boxShadow: "0 10px 30px rgba(15,23,42,0.03)",
    },
    btnGhost: {
      padding: "10px 14px",
      borderRadius: 10,
      border: "1px solid #e5e7eb",
      background: "white",
      fontWeight: 900,
      cursor: "pointer",
      color: "#0f172a",
    },
    btnPrimary: (disabled) => ({
      padding: "10px 14px",
      borderRadius: 10,
      border: "1px solid #1e3a8a",
      background: "#1e3a8a",
      color: "white",
      fontWeight: 950,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.85 : 1,
    }),
  };

  // Counts dropdown (popover)
  const [openCounts, setOpenCounts] = React.useState(false);
  const countsRef = React.useRef(null);

  React.useEffect(() => {
    function onDoc(e) {
      if (countsRef.current && countsRef.current.contains(e.target)) return;
      setOpenCounts(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") setOpenCounts(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // ✅ remove "Other" from counts options
  const availableCountTypes = (Array.isArray(findingTypes) ? [...findingTypes] : [])
    .filter((t) => !isOtherLabel(t))
    .sort(alphaSort);


  const selectedCountTypes = Object.keys(form.counts || {})
    .filter((t) => !isOtherLabel(t)) // ✅ hide existing "Other" from UI too
    .sort(alphaSort);

  const remainingTypes = availableCountTypes.filter((t) => !selectedCountTypes.includes(t));

  const canHaveInspector = isFlag || isVetting;

  const notesRef = React.useRef(null);
  function autoGrow(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }
  React.useEffect(() => {
    if (notesRef.current) autoGrow(notesRef.current);
  }, []);

  // ✅ remove "Other" from inspection type dropdown
  const inspectionTypeOptions = (Array.isArray(inspectionTypesRaw) ? inspectionTypesRaw : []).filter(
    (t) => String(t || "").toLowerCase() !== "other"
  );


  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      {/* no spinners */}
      <style>{`
        input.noSpin::-webkit-outer-spin-button,
        input.noSpin::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input.noSpin[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* Row 1 (ALWAYS): Date, Vessel, Type, Place */}
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <input
          type="date"
          value={form.date}
          onChange={(e) => setField("date", e.target.value)}
          style={ui.input}
          required
          aria-label="Date"
          title="Date *"
        />

        <select
          value={form.vessel}
          onChange={(e) => setField("vessel", e.target.value)}
          style={ui.input}
          required
          aria-label="Vessel"
        >
          <option value="">Vessel *</option>
          {vessels.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>

        <select
          value={form.inspection_type}
          onChange={(e) => setField("inspection_type", e.target.value)}
          style={ui.input}
          required
          aria-label="Type of inspection"
        >
          <option value="" disabled>
            Type of inspection *
          </option>
          {inspectionTypeOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <input
          placeholder="Place of inspection"
          value={form.place}
          onChange={(e) => setField("place", e.target.value)}
          style={ui.input}
          aria-label="Place of inspection"
        />
      </div>

      {/* ✅ Vetting-only: Validity */}
      {isVetting ? (
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "minmax(240px, 360px)",
            alignItems: "center",
            justifyContent: "start",
          }}
        >
          <select
            value={form.validity_months}
            onChange={(e) => setField("validity_months", e.target.value)}
            style={ui.input}
            aria-label="Validity (months)"
            title="Validity (months)"
          >
            <option value="0">Validity: 0 months</option>
            <option value="3">Validity: 3 months</option>
            <option value="6">Validity: 6 months</option>
            <option value="9">Validity: 9 months</option>
            <option value="12">Validity: 12 months</option>
          </select>
        </div>
      ) : null}

      {/* Row 2: dynamic ONLY for PSC/Flag */}
      {showSecondRow ? (
        <>
          {isPSC ? (
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "minmax(260px, 1fr) 1fr",
                alignItems: "center",
              }}
            >
              <select
                value={form.psc_authority}
                onChange={(e) => setField("psc_authority", e.target.value)}
                style={ui.input}
                aria-label="PSC Authority / MoU"
                required
              >
                <option value="" disabled>
                  PSC Authority / MoU *
                </option>
                {pscAuthorities.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}

              </select>

              <div
                style={{
                  height: 42,
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  padding: "0 10px",
                  background: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontWeight: 900,
                  color: "#0f172a",
                  justifyContent: "space-between",
                  boxShadow: "0 10px 30px rgba(15,23,42,0.03)",
                }}
              >
                <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <span>Detention</span>
                  <input
                    type="checkbox"
                    checked={!!form.detention}
                    onChange={(e) => setField("detention", e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                </label>

                <input
                  type="number"
                  className="noSpin"
                  min="0"
                  step="1"
                  value={form.cost}
                  onChange={(e) => setField("cost", e.target.value)}
                  placeholder="Cost"
                  aria-label="Cost"
                  style={{
                    height: 34,
                    width: 140,
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    padding: "0 10px",
                    outline: "none",
                    fontWeight: 900,
                    color: "#0f172a",
                    background: "white",
                  }}
                />
              </div>
            </div>
          ) : null}

          {isFlag ? (
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "minmax(220px, 1fr) 1fr",
                alignItems: "center",
              }}
            >
              <select
                value={form.flag_state}
                onChange={(e) => setField("flag_state", e.target.value)}
                style={ui.input}
                aria-label="Flag State"
                required
              >
                <option value="" disabled>
                  Flag State *
                </option>
               {flagStates.map((fs) => (
                  <option key={fs} value={fs}>
                    {fs}
                  </option>
                ))}

              </select>

              <div
                style={{
                  height: 42,
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  padding: "0 10px",
                  background: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontWeight: 900,
                  color: "#0f172a",
                  justifyContent: "space-between",
                  boxShadow: "0 10px 30px rgba(15,23,42,0.03)",
                }}
              >
                <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <span>Detention</span>
                  <input
                    type="checkbox"
                    checked={!!form.detention}
                    onChange={(e) => setField("detention", e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                </label>

                <input
                  type="number"
                  className="noSpin"
                  min="0"
                  step="1"
                  value={form.cost}
                  onChange={(e) => setField("cost", e.target.value)}
                  placeholder="Total Cost"
                  aria-label="Total Cost"
                  style={{
                    height: 34,
                    width: 140,
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    padding: "0 10px",
                    outline: "none",
                    fontWeight: 900,
                    color: "#0f172a",
                    background: "white",
                  }}
                />
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {/* Counts */}
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 950, color: "#0f172a" }}>Counts</div>

          <div ref={countsRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setOpenCounts((p) => !p)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "white",
                cursor: "pointer",
                fontWeight: 900,
                color: "#0f172a",
              }}
            >
              <Plus size={16} />
              Add count
              <ChevronDown size={16} />
            </button>

            {openCounts ? (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 44,
                  width: 260,
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  boxShadow: "0 14px 40px rgba(2,6,23,0.14)",
                  overflow: "hidden",
                  zIndex: 80,
                }}
              >
                <div style={{ padding: 10, fontWeight: 950, borderBottom: "1px solid #f1f5f9" }}>
                  Επιλογή count type
                </div>

                <div style={{ maxHeight: 240, overflow: "auto" }}>
                  {remainingTypes.length === 0 ? (
                    <div style={{ padding: 12, color: "#64748b", fontWeight: 900 }}>No more types</div>
                  ) : (
                    remainingTypes.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          addCountType(t);
                          setOpenCounts(false);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 12px",
                          border: "none",
                          background: "white",
                          cursor: "pointer",
                          fontWeight: 900,
                          color: "#0f172a",
                        }}
                      >
                        {t}
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {selectedCountTypes.length === 0 ? (
          <div style={{ color: "#64748b", fontSize: 13, fontWeight: 900 }}>No counts selected</div>
        ) : (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {selectedCountTypes.map((t) => (
              <div
                key={t}
                style={{
                  width: 170,
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 10,
                  background: "white",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 950,
                      color: "#0f172a",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={t}
                  >
                    {t}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCount(t)}
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: "#b91c1c",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontWeight: 950,
                      padding: 0,
                    }}
                    title="Remove count"
                  >
                    <X size={16} />
                  </button>
                </div>

                <input
                  type="text"
                  inputMode="numeric"
                  value={form.counts?.[t] ?? ""}
                  onChange={(e) => setCount(t, e.target.value)}
                  placeholder="0"
                  style={{
                    width: 64,
                    height: 36,
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    padding: "0 10px",
                    outline: "none",
                    fontWeight: 950,
                    color: "#0f172a",
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attachments */}
      <div style={{ display: "grid", gap: 8, marginTop: 2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 950, color: "#0f172a" }}>Attachments</div>

          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "white",
              cursor: "pointer",
              fontWeight: 950,
            }}
          >
            <Paperclip size={16} />
            Add files
            <input
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {form.attachments.length === 0 ? (
          <div style={{ color: "#64748b", fontSize: 13, fontWeight: 900 }}>No attachments</div>
        ) : (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
            {form.attachments.map((a, idx) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  background: "white",
                  borderTop: idx === 0 ? "none" : "1px solid #f1f5f9",
                  gap: 10,
                }}
              >
                <a
                  href={a.url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    minWidth: 0,
                    textDecoration: "none",
                    color: "#0f172a",
                    flex: 1,
                    cursor: a.url ? "pointer" : "default",
                  }}
                  onClick={(e) => {
                    if (!a.url) e.preventDefault();
                  }}
                  title={a.url ? "Open attachment" : ""}
                >
                  <div style={{ fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.name}
                  </div>
                  <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>
                    {(a.size / 1024).toFixed(1)} KB • {a.type}
                  </div>
                </a>

                <button
                  type="button"
                  onClick={() => removeAttachment(a.id)}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "#b91c1c",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 950,
                  }}
                  title="Remove"
                >
                  <Trash2 size={16} /> Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <textarea
        ref={notesRef}
        value={form.notes}
        onChange={(e) => {
          setField("notes", e.target.value);
          autoGrow(e.target);
        }}
        placeholder="Notes"
        style={{
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          padding: 12,
          background: "white",
          outline: "none",
          resize: "none",
          overflow: "hidden",
          minHeight: 44,
          height: 44,
          fontWeight: 900,
          color: "#0f172a",
          boxShadow: "0 10px 30px rgba(15,23,42,0.03)",
        }}
        aria-label="Notes"
      />

      {/* Inspector Name (optional) AFTER Notes */}
      {canHaveInspector ? (
        <div style={{ display: "grid", gap: 10 }}>
          {!showInspector ? (
            <button
              type="button"
              onClick={() => setShowInspector(true)}
              style={{
                height: 42,
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "white",
                fontWeight: 950,
                cursor: "pointer",
                color: "#0f172a",
                justifySelf: "start",
                padding: "0 14px",
              }}
              title="Add inspector name"
            >
              + Add inspector name
            </button>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "minmax(220px, 520px) auto",
                alignItems: "center",
                justifyContent: "start",
              }}
            >
              <input
                placeholder="Inspector Name"
                value={form.inspector_name}
                onChange={(e) => setField("inspector_name", e.target.value)}
                style={{ ...ui.input, width: "100%" }}
                aria-label="Inspector Name"
              />
              <button
                type="button"
                onClick={() => {
                  setShowInspector(false);
                  setField("inspector_name", "");
                }}
                style={{
                  height: 42,
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  fontWeight: 950,
                  cursor: "pointer",
                  color: "#b91c1c",
                  padding: "0 12px",
                }}
                title="Remove inspector name"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
        <button type="button" onClick={onCancel} style={ui.btnGhost}>
          Cancel
        </button>

        <button type="submit" disabled={saving} style={ui.btnPrimary(!!saving)}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
