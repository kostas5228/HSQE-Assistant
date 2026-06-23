// ../components/InspectionForm.jsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "../api";

export default function InspectionForm({ initial = {}, onCancel, onSave, saving, onDraftChange }) {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  // ✅ Dropdown options come from Settings
  const vessels = Array.isArray(settings?.vessels) ? settings.vessels : [];
  const inspectionTypes = Array.isArray(settings?.inspectionTypes) ? settings.inspectionTypes : [];
  const pscAuthorities = Array.isArray(settings?.pscAuthorities) ? settings.pscAuthorities : [];
  const findingTypes = Array.isArray(settings?.findingTypes) ? settings.findingTypes : [];
  const flagStates = Array.isArray(settings?.flagStates) ? settings.flagStates : [];


  const [form, setForm] = React.useState({
    date: initial.date || "",
    vessel: initial.vessel || "",

    inspection_type: initial.inspection_type ?? "",
    psc_authority: initial.psc_authority || "",

    flag_state: initial.flag_state || "",
    inspector_name: initial.inspector_name || "",

    // kept in state for compatibility, but UI removed (per request)
    detention: !!initial.detention,
    cost: String(initial.cost ?? 0),

    place: initial.place || "",

    cpa_number: initial.cpa_number || "",
    code: initial.code || "",

    finding_type: initial.finding_type ?? "",

    master: initial.master || "",
    chief_engineer: initial.chief_engineer || "",

    description: initial.description || "",
    corrective_action: initial.corrective_action || "",
    preventive_action: initial.preventive_action || "",
    notes: initial.notes || "",
  });

    // ✅ Σταθερό "κλειδί" για να καταλαβαίνουμε πότε άλλαξε record
  // (αν δεν έχει id -> θεωρούμε "new")
  const initialKey = initial?.id ? String(initial.id) : "__new__";


      // ✅ Hydrate ΜΟΝΟ όταν αλλάζει record (όχι σε κάθε render)
      React.useEffect(() => {
        setForm({
          date: initial.date || "",
          vessel: initial.vessel || "",
    
          inspection_type: initial.inspection_type ?? "",
          psc_authority: initial.psc_authority || "",
    
          flag_state: initial.flag_state || "",
          inspector_name: initial.inspector_name || "",
    
          detention: !!initial.detention,
          cost: String(initial.cost ?? 0),
    
          place: initial.place || "",
    
          cpa_number: initial.cpa_number || "",
          code: initial.code || "",
    
          finding_type: initial.finding_type ?? "",
    
          master: initial.master || "",
          chief_engineer: initial.chief_engineer || "",
    
          description: initial.description || "",
          corrective_action: initial.corrective_action || "",
          preventive_action: initial.preventive_action || "",
          notes: initial.notes || "",
        });
      }, [initialKey]);



  const type = String(form.inspection_type || "").toLowerCase();
  const isPSC = type === "psc";
  const isFlag = type === "flag";
  const isVetting = type === "vetting";
  const showSecondRow = isPSC || isFlag || isVetting;

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
        if (!(flag || vet)) next.inspector_name = "";

        // as requested: detention/cost not used in UI
        next.detention = false;
        next.cost = "0";
      }

      return next;
    });
  }

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

  function submit(e) {
    e.preventDefault();

    // keep payload compatible (no detention/cost usage)
    const payload = {
      ...form,
      detention: false,
      cost: 0,
      psc_authority: isPSC ? form.psc_authority : "",
      flag_state: isFlag ? form.flag_state : "",
      inspector_name: isFlag || isVetting ? String(form.inspector_name || "").trim() : "",
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
          boxShadow: "0 4px 12px rgba(15,23,42,0.04)",
          width: "100%",
          boxSizing: "border-box",
          minWidth: 0,
          appearance: "none",
          WebkitAppearance: "none",
        },

     textarea: {
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        padding: 12,
        background: "white",
        outline: "none",
        fontWeight: 800,
        color: "#0f172a",
        boxShadow: "0 4px 12px rgba(15,23,42,0.04)",
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
        lineHeight: 1.5,
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

    const descRef = React.useRef(null);
    const corrRef = React.useRef(null);
    const prevRef = React.useRef(null);
    const notesRef = React.useRef(null);

    function autoGrow(el, maxPx = 260) {
      if (!el) return;
      // Use "0" instead of "auto" — Safari/WebKit returns wrong scrollHeight
      // when overflow is "hidden" and height is "auto", causing elements to overlap.
      el.style.height = "0";
      const natural = el.scrollHeight;
      const next = Math.min(natural, maxPx);
      el.style.height = `${next}px`;
      el.style.overflowY = natural > maxPx ? "auto" : "hidden";
    }

  function autoGrowAll() {
    autoGrow(descRef.current, 260);
    autoGrow(corrRef.current, 260);
    autoGrow(prevRef.current, 260);
    autoGrow(notesRef.current, 220);
  }


    // ✅ Auto-grow σε ΟΛΑ τα textareas όταν αλλάζουν τα κείμενα
    React.useLayoutEffect(() => {
      autoGrowAll();
    }, [form.description, form.corrective_action, form.preventive_action, form.notes]);
  
    // ✅ Επίσης, όταν αλλάξει record (Edit σε άλλο), κάνε autoGrow αμέσως
    React.useLayoutEffect(() => {
      autoGrowAll();
    }, [initialKey]);

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      {/* Row 1 */}
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
          {inspectionTypes.map((t) => (
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

      {/* Row 2: dynamic */}
      {showSecondRow ? (
        <>
          {/* PSC -> only PSC Authority */}
          {isPSC ? (
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(260px, 520px)" }}>
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
            </div>
          ) : null}

          {/* Flag -> only Flag State + Inspector Name */}
          {isFlag ? (
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "minmax(220px, 1fr) minmax(260px, 1fr)",
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

              <input
                placeholder="Inspector Name"
                value={form.inspector_name}
                onChange={(e) => setField("inspector_name", e.target.value)}
                style={ui.input}
                aria-label="Inspector Name"
                required
              />
            </div>
          ) : null}

          {/* Vetting -> Inspector Name left, up to mid */}
          {isVetting ? (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ width: "100%", maxWidth: 520 }}>
                <input
                  placeholder="Inspector Name"
                  value={form.inspector_name}
                  onChange={(e) => setField("inspector_name", e.target.value)}
                  style={ui.input}
                  aria-label="Inspector Name"
                  required
                />
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {/* CPA / Code / Finding Types */}
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          alignItems: "center",
        }}
      >
        <input
          placeholder="CPA"
          value={form.cpa_number}
          onChange={(e) => setField("cpa_number", e.target.value)}
          style={ui.input}
          aria-label="CPA"
        />

        <input
          placeholder="Code"
          value={form.code}
          onChange={(e) => setField("code", e.target.value)}
          style={ui.input}
          aria-label="Code"
        />

        <select
          value={form.finding_type}
          onChange={(e) => setField("finding_type", e.target.value)}
          style={ui.input}
          aria-label="Finding Type"
          required
        >
          <option value="" disabled>
            Finding Type *
          </option>
          {findingTypes.map((ft) => (
            <option key={ft} value={ft}>
              {ft}
            </option>
          ))}
        </select>
      </div>

      {/* Master / Chief */}
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        <input
          placeholder="Master"
          value={form.master}
          onChange={(e) => setField("master", e.target.value)}
          style={ui.input}
          aria-label="Master"
        />
        <input
          placeholder="Chief Engineer"
          value={form.chief_engineer}
          onChange={(e) => setField("chief_engineer", e.target.value)}
          style={ui.input}
          aria-label="Chief Engineer"
        />
      </div>

      <textarea
        ref={descRef}
        placeholder="Description *"
        value={form.description}
        onChange={(e) => {
          setField("description", e.target.value);
          autoGrow(e.target, 260);
        }}
        rows={3}
        style={{
          ...ui.textarea,
          minHeight: 96,      // ~3 lines
          maxHeight: 260,
          resize: "none",
          overflow: "hidden",
        }}
        required
        aria-label="Description"
      />

      <textarea
        ref={corrRef}
        placeholder="Corrective Action"
        value={form.corrective_action}
        onChange={(e) => {
          setField("corrective_action", e.target.value);
          autoGrow(e.target, 260);
        }}
        rows={3}
        style={{
          ...ui.textarea,
          minHeight: 96,
          maxHeight: 260,
          resize: "none",
          overflow: "hidden",
        }}
        aria-label="Corrective Action"
      />

      <textarea
        ref={prevRef}
        placeholder="Preventive Action"
        value={form.preventive_action}
        onChange={(e) => {
          setField("preventive_action", e.target.value);
          autoGrow(e.target, 260);
        }}
        rows={3}
        style={{
          ...ui.textarea,
          minHeight: 96,
          maxHeight: 260,
          resize: "none",
          overflow: "hidden",
        }}
        aria-label="Preventive Action"
      />


      {/* Notes -> 1 line + auto-grow */}
      <textarea
        ref={notesRef}
        value={form.notes}
        onChange={(e) => {
          setField("notes", e.target.value);
          autoGrow(e.target, 220);
        }}
        rows={1}
        placeholder="Notes"
        style={{
          ...ui.textarea,
          minHeight: 44,
          height: 44,
          maxHeight: 220,
          resize: "none",
          overflow: "hidden",
          paddingTop: 11,
          paddingBottom: 11,
        }}
        aria-label="Notes"
      />


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
