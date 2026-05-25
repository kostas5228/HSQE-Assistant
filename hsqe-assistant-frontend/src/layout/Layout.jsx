// src/layout/Layout.jsx

import React from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "../api";
import { canAccessTab } from "../components/RequireTab";
import GlobalSearchModal from "../components/GlobalSearchModal";
import { useGlobalSearch } from "../state/globalSearch";

import {
  Ship,
  LayoutDashboard,
  FileText,
  AlertCircle,
  ListChecks,
  Users,
  LogIn,
  Settings as SettingsIcon,
  Search,
  Menu,
  X,
} from "lucide-react";

/* Simple media query hook */
function useMediaQuery(query) {
  const get = React.useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const [matches, setMatches] = React.useState(get);

  React.useEffect(() => {
    const m = window.matchMedia(query);

    const onChange = () => setMatches(m.matches);

    onChange();

    if (m.addEventListener) {
      m.addEventListener("change", onChange);
    } else {
      m.addListener(onChange);
    }

    return () => {
      if (m.removeEventListener) {
        m.removeEventListener("change", onChange);
      } else {
        m.removeListener(onChange);
      }
    };
  }, [query]);

  return matches;
}

export default function Layout() {
  const isMobile = useMediaQuery("(max-width: 900px)");
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const gs = useGlobalSearch();

  /* Keyboard shortcut: Ctrl/Cmd + K */
  React.useEffect(() => {
    const onKeyDown = (e) => {
      const key = String(e.key || "").toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (mod && key === "k") {
        e.preventDefault();
        gs.open();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gs]);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  });

  /* Colors */
  const NAV_BG = "#0b2a66";
  const NAV_BG_ACTIVE = "#133a86";
  const NAV_HOVER = "#133a86";
  const TEXT_MUTED = "#c7d2fe";

  /* Layout styles */
  const container = {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "0 16px",
  };

  const navBar = {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: NAV_BG,
    color: "white",
    boxShadow: "0 10px 30px rgba(2,6,23,0.18)",
  };

  const navInner = {
    height: 64,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  };

  const brand = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    textDecoration: "none",
    color: "white",
    minWidth: 260,
  };

  const brandTitle = {
    fontWeight: 950,
    fontSize: 20,
    lineHeight: 1.05,
  };

  const brandSub = {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: 700,
  };

  const desktopNav = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "nowrap",
    overflow: "hidden",
  };

  const iconBtn = {
    border: "none",
    background: "transparent",
    color: "white",
    width: 38,
    height: 38,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  };

  const navLinkBase = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 12,
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 14,
    color: "#e2e8f0",
    whiteSpace: "nowrap",
    transition: "background 120ms ease, color 120ms ease",
  };

  const navLinkStyle = ({ isActive }) => ({
    ...navLinkBase,
    background: isActive ? NAV_BG_ACTIVE : "transparent",
    color: isActive ? "white" : "#dbeafe",
  });

  /* Navigation items */
  const allNavItems = [
    {
      label: "Certificates",
      to: "/certificates",
      icon: FileText,
      tabKey: "certificates",
    },
    {
      label: "Inspections",
      to: "/inspections",
      icon: AlertCircle,
      tabKey: "inspections",
    },
    {
      label: "Tasks",
      to: "/tasks",
      icon: ListChecks,
      tabKey: "tasks",
    },
    {
      label: "Directory",
      to: "/directory",
      icon: Users,
      tabKey: "directory",
    },
    
  ];

  /* Filter by permissions */
  const navItems = React.useMemo(() => {
    if (!me) return allNavItems;

    return allNavItems.filter((it) =>
      canAccessTab(me, it.tabKey)
    );
  }, [me]);

  const showSettings = !me
    ? true
    : canAccessTab(me, "settings");

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Navigation */}
      <header style={navBar}>
        <div style={container}>
          <div style={navInner}>
            {/* Brand */}
            <Link to="/" style={brand} onClick={closeMobile}>
              <Ship size={30} />

              <div style={{ display: "grid", gap: 2 }}>
                <div style={brandTitle}>HSQE Assistant</div>
                <div style={brandSub}>
                  Maritime Management System
                </div>
              </div>
            </Link>

            {/* Desktop Nav */}
            {!isMobile ? (
              <div style={desktopNav}>
                {/* Search */}
                <button
                  type="button"
                  style={iconBtn}
                  onClick={() => gs.open()}
                  title="Search"
                >
                  <Search size={18} />
                </button>

                {navItems.map((it) => {
                  const Icon = it.icon;

                  return (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      style={navLinkStyle}
                      onClick={closeMobile}
                    >
                      <Icon size={16} />
                      <span>{it.label}</span>
                    </NavLink>
                  );
                })}

                {/* Settings */}
                {showSettings && (
                  <NavLink
                    to="/settings"
                    style={navLinkStyle}
                    onClick={closeMobile}
                  >
                    <SettingsIcon size={16} />
                    <span>Settings</span>
                  </NavLink>
                )}
                {/* Sign Out */}
                <NavLink
                  to="/signout"
                  style={navLinkStyle}
                  onClick={closeMobile}
                >
                  <LogIn size={16} />
                  <span>Sign Out</span>
                </NavLink>
              </div>
            ) : (
              /* Mobile Menu Button */
              <button
                type="button"
                style={{
                  ...iconBtn,
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                }}
                onClick={() => setMobileOpen((p) => !p)}
                title="Menu"
              >
                {mobileOpen ? (
                  <X size={22} />
                ) : (
                  <Menu size={22} />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobile && mobileOpen && (
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div
              style={{
                ...container,
                paddingTop: 10,
                paddingBottom: 12,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  closeMobile();
                  gs.open();
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border:
                    "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                <Search size={18} />
                Search
              </button>

              <div style={{ height: 10 }} />

              <div style={{ display: "grid", gap: 8 }}>
                {navItems.map((it) => {
                  const Icon = it.icon;

                  return (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      onClick={closeMobile}
                      style={({ isActive }) => ({
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 12px",
                        borderRadius: 12,
                        textDecoration: "none",
                        fontWeight: 900,
                        color: "white",
                        background: isActive
                          ? NAV_BG_ACTIVE
                          : "rgba(255,255,255,0.04)",
                        border:
                          "1px solid rgba(255,255,255,0.10)",
                      })}
                    >
                      <Icon size={18} />
                      {it.label}
                    </NavLink>
                  );
                })}

                {showSettings && (
                  <NavLink
                    to="/settings"
                    onClick={closeMobile}
                    style={({ isActive }) => ({
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 12px",
                      borderRadius: 12,
                      textDecoration: "none",
                      fontWeight: 900,
                      color: "white",
                      background: isActive
                        ? NAV_BG_ACTIVE
                        : "rgba(255,255,255,0.04)",
                      border:
                        "1px solid rgba(255,255,255,0.10)",
                    })}
                  >
                    <SettingsIcon size={18} />
                    Settings
                  </NavLink>
                )}

                <NavLink
                  to="/signout"
                  onClick={closeMobile}
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 12px",
                    borderRadius: 12,
                    textDecoration: "none",
                    fontWeight: 900,
                    color: "white",
                    background: isActive
                      ? NAV_BG_ACTIVE
                      : "rgba(255,255,255,0.04)",
                    border:
                      "1px solid rgba(255,255,255,0.10)",
                  })}
                >
                  <LogIn size={18} />
                  Sign Out
                </NavLink>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: 20,
          }}
        >
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          background: "white",
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              textAlign: "center",
              color: "#475569",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            HSQE Assistant © 2025 • Maritime Management System
          </div>
        </div>
      </footer>

      <GlobalSearchModal />
    </div>
  );
}
