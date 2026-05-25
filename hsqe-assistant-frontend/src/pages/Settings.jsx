// src/pages/Settings.jsx
import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, getSettings, updateSettings, listUsers, updateUser } from "../api";

// --------------------
// Small helpers
// --------------------
function norm2Key(v) {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return "";
  return s.slice(0, 2);
}

function asObj(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

function normEmail(v) {
  return String(v || "").trim().toLowerCase();
}

function ensureUserPerms(u) {
  const isAdmin = Boolean(u?.is_admin);
  const tabs = u?.permissions?.tabs || {};
  const vessels = Array.isArray(u?.permissions?.vessels) ? u.permissions.vessels : ["ALL"];

  return {
    ...u,
    permissions: {
      tabs: {
        dashboard: Boolean(tabs.dashboard ?? true),
        certificates: Boolean(tabs.certificates ?? true),
        inspections: Boolean(tabs.inspections ?? true),
        tasks: Boolean(tabs.tasks ?? true),
        directory: Boolean(tabs.directory ?? true),
        // settings is NOT managed as toggle: admin always sees it, non-admin never sees it.
      },
      vessels: vessels.length ? vessels : ["ALL"],
    },
    is_admin: isAdmin,
  };
}

// --------------------
// List editor
// --------------------
function ListEditor({ title, value, onChange, placeholder = "Add item..." }) {
  const [txt, setTxt] = React.useState("");

  function add() {
    const v = txt.trim();
    if (!v) return;
    if (value.includes(v)) {
      setTxt("");
      return;
    }
    onChange([...value, v]);
    setTxt("");
  }

  function remove(item) {
    onChange(value.filter((x) => x !== item));
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "white", padding: 14 }}>
      <div style={{ fontWeight: 950, marginBottom: 10 }}>{title}</div>

      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          placeholder={placeholder}
          style={{
            height: 42,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            padding: "0 12px",
            flex: 1,
          }}
        />
        <button
          type="button"
          onClick={add}
          style={{
            height: 42,
            padding: "0 14px",
            borderRadius: 10,
            border: "1px solid #0f172a",
            background: "#0f172a",
            color: "white",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Add
        </button>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {value.map((x) => (
          <span
            key={x}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 999,
              background: "#f1f5f9",
              border: "1px solid #e5e7eb",
              fontWeight: 800,
            }}
          >
            {x}
            <button
              type="button"
              onClick={() => remove(x)}
              style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 900 }}
              title="Remove"
            >
              ×
            </button>
          </span>
        ))}
        {value.length === 0 ? <div style={{ color: "#64748b" }}>Empty</div> : null}
      </div>
    </div>
  );
}

// --------------------
// Map editor for code groups
// --------------------
function MapEditor({
  title,
  subtitle,
  value,
  onChange,
  keyPlaceholder = "e.g. 07",
  valuePlaceholder = "e.g. Fire Safety",
  hideKeys = [],
}) {
  const obj = asObj(value);

  const [k, setK] = React.useState("");
  const [v, setV] = React.useState("");

  const entries = React.useMemo(() => {
    const list = Object.entries(obj)
      .map(([key, label]) => ({ key: String(key ?? "").trim(), label: String(label ?? "") }))
      .filter((x) => x.key !== "")
      .filter((x) => !hideKeys.includes(norm2Key(x.key)))
      .sort((a, b) => a.key.localeCompare(b.key));
    return list;
  }, [obj, hideKeys]);

  function add() {
    const key = norm2Key(k);
    const label = String(v ?? "").trim();
    if (!key || !label) return;

    if (hideKeys.includes(key)) {
      setK("");
      setV("");
      return;
    }

    const next = { ...obj, [key]: label };
    onChange(next);
    setK("");
    setV("");
  }

  function remove(key) {
    const kk = String(key);
    const next = { ...obj };
    delete next[kk];

    const nk = norm2Key(kk);
    if (nk && nk !== kk) delete next[nk];

    onChange(next);
  }

  function updateKey(oldKey, newKeyRaw) {
    const oldK = String(oldKey);
    const newK = norm2Key(newKeyRaw);

    if (!newK) return;
    if (hideKeys.includes(newK)) return;
    if (newK === oldK) return;

    const label = obj[oldK];
    const next = { ...obj };
    delete next[oldK];
    next[newK] = String(label ?? "").trim();

    onChange(next);
  }

  function updateLabel(key, newLabelRaw) {
    const kk = String(key);
    const label = String(newLabelRaw ?? "").trim();
    const next = { ...obj, [kk]: label };
    onChange(next);
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "white", padding: 14 }}>
      <div style={{ display: "grid", gap: 4, marginBottom: 10 }}>
        <div style={{ fontWeight: 950 }}>{title}</div>
        {subtitle ? <div style={{ color: "#64748b", fontWeight: 800, fontSize: 12 }}>{subtitle}</div> : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 110px", gap: 10, alignItems: "center" }}>
        <input
          value={k}
          onChange={(e) => setK(e.target.value)}
          placeholder={keyPlaceholder}
          style={{
            height: 42,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            padding: "0 12px",
            fontWeight: 900,
            textTransform: "uppercase",
          }}
        />
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder={valuePlaceholder}
          style={{ height: 42, borderRadius: 10, border: "1px solid #e5e7eb", padding: "0 12px" }}
        />
        <button
          type="button"
          onClick={add}
          style={{
            height: 42,
            padding: "0 14px",
            borderRadius: 10,
            border: "1px solid #0f172a",
            background: "#0f172a",
            color: "white",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Add
        </button>
      </div>

      <div style={{ marginTop: 12, border: "1px solid #f1f5f9", borderRadius: 12, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr 110px",
            gap: 10,
            padding: "10px 12px",
            background: "#f8fafc",
            fontWeight: 950,
            color: "#0f172a",
            fontSize: 12,
          }}
        >
          <div>Code</div>
          <div>Label</div>
          <div style={{ textAlign: "right" }}>Actions</div>
        </div>

        {entries.length === 0 ? (
          <div style={{ padding: 12, color: "#64748b", fontWeight: 900 }}>Empty</div>
        ) : (
          entries.map((row) => (
            <div
              key={row.key}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr 110px",
                gap: 10,
                padding: "10px 12px",
                borderTop: "1px solid #f1f5f9",
                alignItems: "center",
              }}
            >
              <input
                defaultValue={row.key}
                onBlur={(e) => updateKey(row.key, e.target.value)}
                style={{
                  height: 38,
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  padding: "0 10px",
                  fontWeight: 950,
                  textTransform: "uppercase",
                }}
              />

              <input
                defaultValue={row.label}
                onBlur={(e) => updateLabel(row.key, e.target.value)}
                style={{ height: 38, borderRadius: 10, border: "1px solid #e5e7eb", padding: "0 10px" }}
              />

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => remove(row.key)}
                  style={{
                    height: 38,
                    padding: "0 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "white",
                    fontWeight: 950,
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 10, color: "#64748b", fontWeight: 800, fontSize: 12 }}>
        Notes: Keys are normalized to 2 chars (uppercase).
      </div>
    </div>
  );
}

// --------------------
// Users & Permissions (admin only)
// --------------------
function UsersPermissions({ vesselsOptions }) {
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
  });

  const mut = useMutation({
    mutationFn: ({ email, input }) => updateUser(email, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["users"] });
      await qc.invalidateQueries({ queryKey: ["me"] });
      await qc.invalidateQueries({ queryKey: ["inspections"] });
      await qc.invalidateQueries({ queryKey: ["certificates"] });
      await qc.invalidateQueries({ queryKey: ["directory"] });
      await qc.invalidateQueries({ queryKey: ["inspection_reports"] });
      await qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  function toggleTab(email, tabKey) {
    const u0 = users.find((x) => normEmail(x.email) === normEmail(email));
    const u = ensureUserPerms(u0 || {});
    const isAdmin = Boolean(u.is_admin);

    const nextTabs = { ...(u.permissions?.tabs || {}) };
    nextTabs[tabKey] = !Boolean(nextTabs[tabKey]);

    // admin toggles are pointless; keep stable
    if (isAdmin) return;

    mut.mutate({
      email,
      input: { permissions: { ...(u.permissions || {}), tabs: nextTabs } },
    });
  }

  function setVessels(email, nextList) {
    const u0 = users.find((x) => normEmail(x.email) === normEmail(email));
    const u = ensureUserPerms(u0 || {});
    const isAdmin = Boolean(u.is_admin);

    // admin always ALL
    if (isAdmin) {
      mut.mutate({
        email,
        input: { permissions: { ...(u.permissions || {}), vessels: ["ALL"] } },
      });
      return;
    }

    const cleaned =
      Array.isArray(nextList) && nextList.includes("ALL")
        ? ["ALL"]
        : (Array.isArray(nextList) ? nextList : []).filter(Boolean);

    mut.mutate({
      email,
      input: { permissions: { ...(u.permissions || {}), vessels: cleaned.length ? cleaned : ["ALL"] } },
    });
  }

  const card = { border: "1px solid #e5e7eb", borderRadius: 14, background: "white", padding: 14 };
  const th = {
    textAlign: "left",
    fontSize: 12,
    color: "#334155",
    fontWeight: 900,
    padding: "10px 12px",
    borderBottom: "1px solid #e5e7eb",
    background: "#f8fafc",
  };
  const td = { padding: "10px 12px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top", fontSize: 14 };

  const tabs = [
    { key: "dashboard", label: "Dashboard" },
    { key: "certificates", label: "Certificates" },
    { key: "inspections", label: "Inspections" },
    { key: "tasks", label: "Tasks" },
    { key: "directory", label: "Directory" },
  ];

  if (isLoading) {
    return (
      <div style={card}>
        <div style={{ fontWeight: 950, marginBottom: 8 }}>Users & Permissions</div>
        <div style={{ color: "#64748b", fontWeight: 800 }}>Loading users...</div>
      </div>
    );
  }

  return (
    <div style={card}>
      <div style={{ display: "grid", gap: 4, marginBottom: 10 }}>
        <div style={{ fontWeight: 950 }}>Users & Permissions</div>
        <div style={{ color: "#64748b", fontWeight: 800, fontSize: 12 }}>
          Admin can enable/disable tabs per user, and set vessel visibility. (Tasks remain private: own + assigned.)
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 950 }}>
          <thead>
            <tr>
              <th style={th}>User</th>
              <th style={th}>Tabs</th>
              <th style={th}>Vessels access</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u0) => {
              const u = ensureUserPerms(u0);
              const isAdmin = Boolean(u.is_admin);
              const vessels = Array.isArray(u.permissions?.vessels) ? u.permissions.vessels : ["ALL"];
              const vesselLabel = vessels.includes("ALL") ? "ALL" : vessels.join(", ");

              return (
                <tr key={u.email}>
                  <td style={td}>
                    <div style={{ fontWeight: 950, color: "#0f172a" }}>{u.full_name || u.email}</div>
                    <div style={{ color: "#64748b", fontWeight: 800, fontSize: 12 }}>{u.email}</div>
                    {isAdmin ? (
                      <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900, color: "#0f172a" }}>
                        ADMIN (always ALL + always Settings)
                      </div>
                    ) : null}
                  </td>

                  <td style={td}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {tabs.map((t) => {
                        const checked = Boolean(u.permissions?.tabs?.[t.key]);
                        const disabled = isAdmin; // admin always sees everything
                        return (
                          <label
                            key={t.key}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "6px 10px",
                              borderRadius: 999,
                              border: "1px solid #e5e7eb",
                              background: checked ? "#0f172a" : "white",
                              color: checked ? "white" : "#0f172a",
                              fontWeight: 900,
                              cursor: disabled ? "not-allowed" : "pointer",
                              opacity: disabled ? 0.6 : 1,
                              userSelect: "none",
                            }}
                            title={disabled ? "Admin sees all tabs" : "Toggle tab visibility"}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled || mut.isPending}
                              onChange={() => toggleTab(u.email, t.key)}
                              style={{ display: "none" }}
                            />
                            {t.label}
                          </label>
                        );
                      })}
                    </div>
                  </td>

                  <td style={td}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ color: "#64748b", fontWeight: 800, fontSize: 12 }}>
                        Current: <span style={{ color: "#0f172a", fontWeight: 950 }}>{vesselLabel}</span>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: "1px solid #e5e7eb",
                            background: vessels.includes("ALL") ? "#0f172a" : "white",
                            color: vessels.includes("ALL") ? "white" : "#0f172a",
                            fontWeight: 900,
                            cursor: isAdmin ? "not-allowed" : "pointer",
                            opacity: isAdmin ? 0.6 : 1,
                            userSelect: "none",
                          }}
                          title={isAdmin ? "Admin is always ALL" : "Give access to all vessels"}
                        >
                          <input
                            type="checkbox"
                            checked={vessels.includes("ALL")}
                            disabled={mut.isPending || isAdmin}
                            onChange={() => setVessels(u.email, ["ALL"])}
                            style={{ display: "none" }}
                          />
                          ALL
                        </label>

                        {vesselsOptions.map((v) => {
                          const checked = !vessels.includes("ALL") && vessels.includes(v);

                          // ✅ FIX: allow picking vessels even when current is ALL (for non-admin users)
                          // (Admin-user remains locked to ALL)
                          const disabled = isAdmin;

                          return (
                            <label
                              key={v}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "6px 10px",
                                borderRadius: 999,
                                border: "1px solid #e5e7eb",
                                background: checked ? "#0f172a" : "white",
                                color: checked ? "white" : "#0f172a",
                                fontWeight: 900,
                                cursor: disabled ? "not-allowed" : "pointer",
                                opacity: disabled ? 0.5 : 1,
                                userSelect: "none",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={mut.isPending || disabled}
                                onChange={() => {
                                  // ✅ if it was ALL, start from empty list and add first vessel
                                  const base = vessels.includes("ALL") ? [] : vessels;
                                  const next = checked ? base.filter((x) => x !== v) : [...base, v];
                                  setVessels(u.email, next);
                                }}
                                style={{ display: "none" }}
                              />
                              {v}
                            </label>
                          );
                        })}
                      </div>

                      <div style={{ color: "#64748b", fontWeight: 800, fontSize: 12 }}>
                        Vessels are enforced across lists (Certificates / Inspections / Directory / Reports / Tasks).
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {mut.isPending ? <div style={{ marginTop: 10, color: "#64748b" }}>Saving permissions...</div> : null}
      </div>
    </div>
  );
}

export default function Settings() {
  const qc = useQueryClient();

  // ✅ hooks first (NO early return before useState/useEffect)
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const mut = useMutation({
    mutationFn: updateSettings,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["settings"] });
      await qc.invalidateQueries({ queryKey: ["inspections"] });
      await qc.invalidateQueries({ queryKey: ["certificates"] });
      await qc.invalidateQueries({ queryKey: ["directory"] });
      await qc.invalidateQueries({ queryKey: ["inspection_reports"] });
      await qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const isAdmin = Boolean(me?.is_admin);

  const [tab, setTab] = React.useState("dropdowns");

  React.useEffect(() => {
    // ✅ keep stable and deterministic
    if (isAdmin) setTab("users");
    else setTab("dropdowns");
  }, [isAdmin]);

  // ✅ now returns are safe
  if (isLoading) return <div style={{ color: "#64748b" }}>Loading settings...</div>;
  if (isError) return <div style={{ color: "#ef4444" }}>Failed to load settings.</div>;

  const settings = data || {
    vessels: [],
    certificateTypes: [],
    departments: [],
    inspectionTypes: [],
    flagStates: [],
    pscAuthorities: [],
    findingTypes: [],
    pscCodeGroups: {},
    vettingCodeGroups: {},
  };

  function patch(partial) {
    mut.mutate({ ...partial });
  }

  const tabsUi = [
    ...(isAdmin ? [{ key: "users", label: "Users & Permissions" }] : []),
    { key: "dropdowns", label: "Dropdowns" },
  ];

  const tabBtn = (active) => ({
    height: 40,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: active ? "#0f172a" : "white",
    color: active ? "white" : "#0f172a",
    fontWeight: 950,
    cursor: "pointer",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 34, fontWeight: 950 }}>Settings</div>
        <div style={{ color: "#64748b", marginTop: 6 }}>
          Admin controls user access & vessels. Dropdown values are global.
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {tabsUi.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} style={tabBtn(tab === t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      {tab === "users" && isAdmin ? <UsersPermissions vesselsOptions={settings.vessels || []} /> : null}

      {tab === "dropdowns" ? (
        <>
          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            }}
          >
            <ListEditor
              title="Vessels"
              value={settings.vessels}
              onChange={(arr) => patch({ vessels: arr })}
              placeholder="e.g. W-NAUTILUS"
            />

            <ListEditor
              title="Certificate Types"
              value={settings.certificateTypes}
              onChange={(arr) => patch({ certificateTypes: arr })}
              placeholder="e.g. Renewal"
            />

            <ListEditor
              title="Departments"
              value={settings.departments}
              onChange={(arr) => patch({ departments: arr })}
              placeholder="e.g. Operations"
            />

            <ListEditor
              title="Inspection Types"
              value={settings.inspectionTypes}
              onChange={(arr) => patch({ inspectionTypes: arr })}
              placeholder="e.g. PSC"
            />

            <ListEditor
              title="Flag States"
              value={settings.flagStates}
              onChange={(arr) => patch({ flagStates: arr })}
              placeholder="e.g. Liberia"
            />

            <ListEditor
              title="PSC Authorities / MoU"
              value={settings.pscAuthorities}
              onChange={(arr) => patch({ pscAuthorities: arr })}
              placeholder="e.g. Paris MoU"
            />

            <ListEditor
              title="Finding Types"
              value={settings.findingTypes}
              onChange={(arr) => patch({ findingTypes: arr })}
              placeholder="e.g. Deficiency"
            />
          </div>

          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
            }}
          >
            <MapEditor
              title="PSC Code Groups (prefix 2)"
              subtitle="Used by statistics charts: frequency by code prefix (first 2 chars)."
              value={settings.pscCodeGroups}
              onChange={(obj) => patch({ pscCodeGroups: obj })}
              keyPlaceholder="e.g. 07"
              valuePlaceholder="e.g. Fire Safety"
              hideKeys={[]}
            />

            <MapEditor
              title="Vetting Code Groups (prefix 2)"
              subtitle="Used by statistics charts: frequency by code prefix (first 2 chars)."
              value={settings.vettingCodeGroups}
              onChange={(obj) => patch({ vettingCodeGroups: obj })}
              keyPlaceholder="e.g. 7A"
              valuePlaceholder="e.g. Fuel Management (Oil)"
              hideKeys={[]}
            />
          </div>
        </>
      ) : null}

      {mut.isPending ? <div style={{ color: "#64748b" }}>Saving...</div> : null}
    </div>
  );
}
