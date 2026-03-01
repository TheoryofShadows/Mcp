import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, Upload, BarChart3, LogIn, Menu, X, Zap } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const NAV_LINKS = [
  { path: "/marketplace", label: "Marketplace", icon: LayoutGrid },
  { path: "/submit",      label: "Submit Tool",  icon: Upload },
  { path: "/dashboard",  label: "Dashboard",    icon: BarChart3 },
];

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
        background: "rgba(10,10,10,0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid #1a1a1a",
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
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-hidden="true"
        >
          <Zap size={16} color="#fff" strokeWidth={2.5} />
        </div>
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 800,
            fontSize: "20px",
            background: "linear-gradient(135deg, #a5b4fc, #6366f1)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.5px",
          }}
        >
          MCPX
        </span>
        <span
          style={{
            fontSize: "10px",
            fontFamily: "var(--font-mono)",
            background: "rgba(99,102,241,0.2)",
            color: "#818cf8",
            border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: "5px",
            padding: "1px 6px",
          }}
        >
          BETA
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
              color: isActive(path) ? "#a5b4fc" : "var(--text-secondary)",
              background: isActive(path) ? "rgba(99,102,241,0.1)" : "transparent",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!isActive(path)) {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.background = "#1a1a1a";
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
      </div>

      {/* Auth */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
                border: "1px solid #2a2a2a",
                borderRadius: "8px",
                color: "var(--text-secondary)",
                fontSize: "13px",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3a3a3a";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
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
                border: "1px solid #2a2a2a",
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
                e.currentTarget.style.borderColor = "#3a3a3a";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
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
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: "var(--font-body)",
                boxShadow: "0 0 20px rgba(99,102,241,0.25)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 0 28px rgba(99,102,241,0.4)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 0 20px rgba(99,102,241,0.25)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Get Started →
            </Link>
          </>
        )}

        {/* Mobile toggle */}
        <button
          className="nav-mobile-toggle"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
          style={{
            display: "none",
            background: "transparent",
            border: "1px solid #2a2a2a",
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
            background: "#0d0d0d",
            borderBottom: "1px solid #1a1a1a",
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
                color: isActive(path) ? "#a5b4fc" : "var(--text-secondary)",
                background: isActive(path) ? "rgba(99,102,241,0.1)" : "transparent",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
