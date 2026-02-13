import { memo, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Badge } from "../ui";

const NAV_LINKS = [
  { path: "/", label: "Marketplace" },
  { path: "/publish", label: "Publish" },
  { path: "/revenue", label: "Revenue" },
  { path: "/docs", label: "Docs" },
];

const Navbar = memo(function Navbar({ onAuthClick }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleNavClick = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <nav className="navbar" aria-label="Main navigation">
      {/* Logo */}
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
        <div
          aria-hidden="true"
          style={{
            width: 32, height: 32,
            background: "linear-gradient(135deg, var(--accent-electric), var(--accent-blue))",
            borderRadius: "var(--radius-md)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "14px", color: "var(--bg-primary)",
          }}
        >
          {"\u2318"}
        </div>
        <span
          style={{
            fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "20px",
            background: "linear-gradient(135deg, var(--accent-electric), var(--accent-blue))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.5px",
          }}
        >
          MCPX
        </span>
        <Badge>BETA</Badge>
      </Link>

      {/* Mobile menu toggle */}
      <button
        className="nav-mobile-toggle"
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
        aria-controls="nav-tabs"
        aria-label="Toggle navigation menu"
      >
        {mobileOpen ? "\u2715" : "\u2630"}
      </button>

      {/* Navigation tabs */}
      <div
        id="nav-tabs"
        className={`nav-tabs${mobileOpen ? " open" : ""}`}
        role="navigation"
        aria-label="Site sections"
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className="nav-tab"
            onClick={handleNavClick}
            aria-current={location.pathname === link.path ? "page" : undefined}
            style={{
              textDecoration: "none",
              background: location.pathname === link.path ? "var(--bg-card)" : undefined,
              color: location.pathname === link.path ? "var(--text-primary)" : undefined,
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Auth buttons */}
      <div
        className="nav-auth"
        style={{ display: "flex", gap: "10px", alignItems: "center" }}
      >
        {user ? (
          <>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)", color: "var(--text-secondary)" }}>
              @{user.username}
            </span>
            <button className="btn btn-outline-green" onClick={logout}>Log Out</button>
          </>
        ) : (
          <>
            <button className="btn btn-outline-green" onClick={onAuthClick}>Sign In</button>
            <button className="btn btn-gradient" onClick={onAuthClick}>Get Started</button>
          </>
        )}
      </div>
    </nav>
  );
});

export default Navbar;
