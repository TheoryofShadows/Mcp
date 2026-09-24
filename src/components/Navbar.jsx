import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, Upload, BarChart3, LogIn, Menu, X, Zap, Tag, Map, ShieldCheck } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import AdminNavLink from "./AdminNavLink";

const NAV_LINKS = [
  { path: "/marketplace", label: "Marketplace", icon: LayoutGrid },
  { path: "/pricing",     label: "Pricing",      icon: Tag },
  { path: "/submit",      label: "Publish",      icon: Upload },
  { path: "/playbook",    label: "Pull plan",    icon: Map },
  { path: "/debug",       label: "Debug",        icon: ShieldCheck },
  { path: "/dashboard",   label: "Dashboard",    icon: BarChart3 },
];

// Descope powers the optional admin area. When it isn't configured we never
// touch its SDK — see AdminNavLink for why that matters (iOS Safari).
const isDescopeConfigured = Boolean(import.meta.env.VITE_DESCOPE_PROJECT_ID);

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "rgba(9,9,11,0.88)",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      {/* Logo */}
      <Link
        to="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          textDecoration: "none",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            background: "var(--text-primary)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-hidden="true"
        >
          <Zap size={16} color="var(--bg-primary)" strokeWidth={2.5} />
        </div>
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: "18px",
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
          }}
        >
          MCPX
        </span>
      </Link>

      {/* Desktop nav */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
        className="nav-desktop"
      >
        {NAV_LINKS.map(({ path, label }) => (
          <Link
            key={path}
            to={path}
            style={{
              textDecoration: "none",
              padding: "6px 14px",
              borderRadius: "8px",
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              fontWeight: 500,
              color: isActive(path) ? "var(--accent-light)" : "var(--text-secondary)",
              background: isActive(path) ? "rgba(138, 154, 134,0.1)" : "transparent",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!isActive(path)) {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.background = "var(--border-subtle)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive(path)) {
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            {label}
          </Link>
        ))}
        {isDescopeConfigured && (
          <AdminNavLink variant="desktop" active={isActive("/admin")} />
        )}
      </div>

      {/* Auth */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div className="nav-auth-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {user ? (
          <>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            >
              @{user.username || user.email?.split("@")[0]}
            </span>
            <button
              onClick={logout}
              style={{
                padding: "7px 16px",
                background: "transparent",
                border: "1px solid var(--border-accent)",
                borderRadius: "8px",
                color: "var(--text-secondary)",
                fontSize: "13px",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-accent)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-accent)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              style={{
                textDecoration: "none",
                padding: "7px 16px",
                background: "transparent",
                border: "1px solid var(--border-accent)",
                borderRadius: "8px",
                color: "var(--text-secondary)",
                fontSize: "13px",
                fontFamily: "var(--font-body)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-accent)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-accent)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <LogIn size={13} />
              Sign In
            </Link>
            <Link
              to="/login"
              style={{
                textDecoration: "none",
                padding: "7px 18px",
                background: "var(--text-primary)",
                borderRadius: "8px",
                color: "var(--bg-primary)",
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: "var(--font-body)",
                boxShadow: "none",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Get Started →
            </Link>
          </>
        )}
        </div>

        {/* Mobile toggle */}
        <button
          className="nav-mobile-toggle"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
          style={{
            display: "none",
            background: "transparent",
            border: "1px solid var(--border-accent)",
            borderRadius: "8px",
            padding: "7px",
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          {mobileOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            top: "60px",
            left: 0,
            right: 0,
            background: "var(--bg-secondary)",
            borderBottom: "1px solid var(--border-subtle)",
            padding: "16px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            zIndex: 99,
          }}
        >
          {NAV_LINKS.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              style={{
                textDecoration: "none",
                padding: "12px 16px",
                borderRadius: "10px",
                fontFamily: "var(--font-body)",
                fontSize: "15px",
                fontWeight: 500,
                color: isActive(path) ? "var(--accent-light)" : "var(--text-secondary)",
                background: isActive(path) ? "rgba(138, 154, 134,0.1)" : "transparent",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
          {isDescopeConfigured && (
            <AdminNavLink
              variant="mobile"
              active={isActive("/admin")}
              onClick={() => setMobileOpen(false)}
            />
          )}

          {/* Auth actions (mobile) */}
          <div style={{ height: "1px", background: "var(--border-subtle)", margin: "8px 0" }} />
          {user ? (
            <button
              onClick={() => { logout(); setMobileOpen(false); }}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "transparent",
                border: "1px solid var(--border-accent)",
                borderRadius: "10px",
                color: "var(--text-secondary)",
                fontSize: "15px",
                fontFamily: "var(--font-body)",
                cursor: "pointer",
              }}
            >
              Sign Out
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                style={{
                  textDecoration: "none",
                  padding: "12px 16px",
                  background: "transparent",
                  border: "1px solid var(--border-accent)",
                  borderRadius: "10px",
                  color: "var(--text-primary)",
                  fontSize: "15px",
                  fontFamily: "var(--font-body)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <LogIn size={15} />
                Sign In
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                style={{
                  textDecoration: "none",
                  padding: "12px 16px",
                  background: "var(--text-primary)",
                  borderRadius: "10px",
                  color: "var(--bg-primary)",
                  fontSize: "15px",
                  fontWeight: 600,
                  fontFamily: "var(--font-body)",
                  textAlign: "center",
                }}
              >
                Get Started →
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
