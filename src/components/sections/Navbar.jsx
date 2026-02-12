import { Badge } from "../ui";

const NAV_VIEWS = ["marketplace", "publish", "revenue", "docs"];

export default function Navbar({ activeView, setActiveView }) {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 32px",
        background: "rgba(7, 7, 10, 0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: 32,
            height: 32,
            background:
              "linear-gradient(135deg, var(--accent-electric), var(--accent-blue))",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Space Mono', monospace",
            fontWeight: 700,
            fontSize: "14px",
            color: "var(--bg-primary)",
          }}
        >
          {"\u2318"}
        </div>
        <span
          style={{
            fontFamily: "'Syne', sans-serif",
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

      {/* Navigation tabs */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          background: "var(--bg-secondary)",
          borderRadius: "10px",
          padding: "3px",
        }}
      >
        {NAV_VIEWS.map((v) => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            style={{
              padding: "7px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              fontWeight: 500,
              background:
                activeView === v ? "var(--bg-card)" : "transparent",
              color:
                activeView === v
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
              transition: "all 0.2s ease",
            }}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Auth buttons */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <button
          style={{
            padding: "8px 20px",
            borderRadius: "8px",
            border: "1px solid var(--accent-electric)",
            background: "transparent",
            color: "var(--accent-electric)",
            cursor: "pointer",
            fontFamily: "'Space Mono', monospace",
            fontSize: "12px",
            fontWeight: 700,
            transition: "all 0.2s ease",
          }}
        >
          Sign In
        </button>
        <button
          style={{
            padding: "8px 20px",
            borderRadius: "8px",
            border: "none",
            background:
              "linear-gradient(135deg, var(--accent-electric), var(--accent-blue))",
            color: "var(--bg-primary)",
            cursor: "pointer",
            fontFamily: "'Space Mono', monospace",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          Get Started
        </button>
      </div>
    </nav>
  );
}
