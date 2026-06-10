import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "../api";

const ui = {
  label: { fontSize: 12, fontWeight: 900, color: "#334155" },
  req: { color: "#b91c1c", marginLeft: 6 },
  help: { fontSize: 12, color: "#64748b" },
  error: { color: "#b91c1c", fontSize: 12, fontWeight: 800 },

  input: {
    height: 42,
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    padding: "0 12px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    background: "white",
    boxShadow: "0 10px 30px rgba(15,23,42,0.03)",
  },

  select: {
    height: 42,
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    padding: "0 12px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    background: "white",
    boxShadow: "0 10px 30px rgba(15,23,42,0.03)",
  },

  dateInput: {
    height: 40,
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    padding: "0 10px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    background: "white",
    boxShadow: "0 10px 30px rgba(15,23,42,0.03)",
    fontSize: 13,
  },

  textareaAuto: {
    height: 40,
    minHeight: 40,
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    padding: "10px 12px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    background: "white",
    boxShadow: "0 10px 30px rgba(15,23,42,0.03)",
    resize: "none",
    overflow: "hidden",
    lineHeight: "18px",
  },

  section: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 14,
    background: "#f8fafc",
    boxSizing: "border-box",
  },

  sectionTitle: { fontSize: 12, fontWeight: 950, color: "#0f172a", letterSpacing: 0.2 },

  footer: {
    position: "sticky",
    bottom: 0,
    background: "linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0.86))",
    paddingTop: 12,
    marginTop: 4,
  },

  btnGhost: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "white",
    fontWeight: 900,
    cursor: "pointer",
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

export default function CertificateForm({ initial = {}, onCancel, onSave, saving, onDraftChange }) {
  // 1) settings query FIRST (hook)
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const vesselsOptions = settingsData?.vessels || [];
  const certTypeOptions = settingsData?.certificateTypes || [];

  // 2) then local form state
  const [form, setForm] = React.useState({
    vessel: initial.vessel || "",
    certificate_code: initial.certificate_code || "",
    type: initial.type || "",
    certificate_name: initial.certificate_name || "",
    from_date: initial.from_date || "",
    to_date: initial.to_date || "",
    notes: initial.notes || "",
  });

  const notesRef = React.useRef(null);

  function setField(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
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
    onSave?.(form);
  }

  React.useEffect(() => {
    const el = notesRef.current;
    if (!el) return;
    el.style.height = "40px";
    el.style.height = `${Math.max(40, el.scrollHeight)}px`;
  }, [form.notes]);

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12, width: "100%", boxSizing: "border-box" }}>
      <div style={ui.section}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10 }}>
          <div style={ui.sectionTitle}>BASICS</div>
          <div style={ui.help}>Fields with * are required</div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={ui.label}>
              Vessel <span style={ui.req}>*</span>
            </label>

            <select value={form.vessel} onChange={(e) => setField("vessel", e.target.value)} style={ui.select} required>
              <option value="">Select vessel</option>
              {vesselsOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>


          </div>

          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "0.85fr 1.15fr", alignItems: "start" }}>
            <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <label style={ui.label}>Code</label>
              <input
                placeholder="e.g. SMC, ISSC"
                value={form.certificate_code}
                onChange={(e) => setField("certificate_code", e.target.value)}
                style={ui.input}
              />

            </div>

            <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <label style={ui.label}>
                Type <span style={ui.req}>*</span>
              </label>

              <select value={form.type} onChange={(e) => setField("type", e.target.value)} style={ui.select} required>
                <option value="">Select type</option>
                {certTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>


            </div>
          </div>

          <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <label style={ui.label}>
              Certificate Name <span style={ui.req}>*</span>
            </label>
            <input
              placeholder="e.g. Safety Management Certificate"
              value={form.certificate_name}
              onChange={(e) => setField("certificate_name", e.target.value)}
              style={ui.input}
              required
            />
          </div>
        </div>
      </div>

      <div style={ui.section}>
        <div style={{ ...ui.sectionTitle, marginBottom: 10 }}>DATES</div>

        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
          <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <label style={ui.label}>From Date</label>
            <input type="date" value={form.from_date} onChange={(e) => setField("from_date", e.target.value)} style={ui.dateInput} />

          </div>

          <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <label style={ui.label}>
              To Date <span style={ui.req}>*</span>
            </label>
            <input type="date" value={form.to_date} onChange={(e) => setField("to_date", e.target.value)} style={ui.dateInput} required />

          </div>
        </div>
      </div>

      <div style={ui.section}>
        <div style={{ ...ui.sectionTitle, marginBottom: 10 }}>NOTES</div>

        <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <label style={ui.label}>Notes</label>
          <textarea
            ref={notesRef}
            placeholder="Additional information..."
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            rows={1}
            style={ui.textareaAuto}
          />

        </div>
      </div>

      <div style={ui.footer}>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onCancel} style={ui.btnGhost}>
            Cancel
          </button>

          <button type="submit" disabled={saving} style={ui.btnPrimary(!!saving)}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </form>
  );
}
