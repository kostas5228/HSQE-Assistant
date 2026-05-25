// src/components/RequireTab.jsx

import React from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "../api";

function canAccessTab(me, tabKey) {
  if (!me) return false;

  // HARD RULE: settings only admin
  if (tabKey === "settings") return Boolean(me.is_admin);

  if (me.is_admin) return true;

  const tabs = me.permissions?.tabs || {};
  return Boolean(tabs?.[tabKey]);
}

export default function RequireTab({ tabKey, children }) {
  const { data: me, isLoading, isError } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  });

  if (isLoading) return <div style={{ color: "#64748b" }}>Loading...</div>;
  if (isError) return <Navigate to="/" replace />;

  const ok = canAccessTab(me, tabKey);
  if (!ok) return <Navigate to="/" replace />;

  return children;
}

export { canAccessTab };
