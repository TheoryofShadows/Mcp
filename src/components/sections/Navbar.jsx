import { memo, useState, useCallback } from "react";
import { Badge } from "../ui";

const NAV_VIEWS = ["marketplace", "publish", "revenue", "docs"];

const Navbar = memo(function Navbar({ activeView, setActiveView }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = useCallback(
    (view) => {
      setActiveView(view);
      setMobileOpen(false);
    },
    [setActiveView]
  );

  return (
    <nav className="navbar" aria-label="Main navigation">
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          aria-hidden="true"
          style={{
            width: 32,
            height: 32,
            background:
              "linear-gradient(135deg, var(--accent-electric), var(--accent-blue))",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: "14px",
            color: "var(--bg-primary)",
          }}
        >
          {"\u2318"}
        </div>
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 800,
            fontSize: "20px",
            background:
              "linear-gradient(135deg, var(--accent-electric), var(--accent-blue))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.5px",
          }}
        >
          MCPX
        </span>
        <Badge>BETA</Badge>
      </div>

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
        role="tablist"
        aria-label="Site sections"
      >
        {NAV_VIEWS.map((v) => (
          <button
            key={v}
            role="tab"
            className="nav-tab"
            onClick={() => handleNavClick(v)}
            aria-selected={activeView === v}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Auth buttons */}
      <div
        className="nav-auth"
        style={{ display: "flex", gap: "10px", alignItems: "center" }}
      >
        <button className="btn btn-outline-green">Sign In</button>
        <button className="btn btn-gradient">Get Started</button>
      </div>
    </nav>
  );
});

export default Navbar;
