import { Link } from "react-router-dom";
import { Github, Zap } from "lucide-react";

const LINKS = {
  Product: [
    { label: "Marketplace", to: "/marketplace" },
    { label: "Submit a Tool", to: "/submit" },
    { label: "Pricing", to: "/pricing" },
    { label: "Dashboard", to: "/dashboard" },
  ],
  Developers: [
    { label: "API Reference", href: "https://github.com/TheoryofShadows/Mcp/blob/main/docs/API.md" },
    { label: "Publishing Guide", href: "https://github.com/TheoryofShadows/Mcp/blob/main/docs/PUBLISHING.md" },
    { label: "Trust & Security", href: "https://github.com/TheoryofShadows/Mcp/blob/main/docs/TRUST.md" },
    { label: "Architecture", href: "https://github.com/TheoryofShadows/Mcp/blob/main/docs/ARCHITECTURE.md" },
  ],
  Company: [
    { label: "GitHub", href: "https://github.com/TheoryofShadows/Mcp" },
    { label: "Changelog", href: "https://github.com/TheoryofShadows/Mcp/blob/main/CHANGELOG.md" },
    { label: "Security Policy", href: "https://github.com/TheoryofShadows/Mcp/blob/main/SECURITY.md" },
    { label: "Contributing", href: "https://github.com/TheoryofShadows/Mcp/blob/main/CONTRIBUTING.md" },
  ],
};

const linkStyle = {
  fontSize: "13px",
  color: "var(--text-muted)",
  textDecoration: "none",
  lineHeight: 1.8,
  transition: "color 0.15s",
  display: "block",
};

export default function Footer() {
  return (
    <footer
      role="contentinfo"
      style={{
        borderTop: "1px solid var(--border-subtle)",
        padding: "56px var(--section-px) 32px",
        background: "#08080d",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Top row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: "48px",
            marginBottom: "48px",
          }}
          className="footer-grid"
        >
          {/* Brand column */}
          <div>
            <Link to="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #22d3ee, #14b8a6)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={16} color="#fff" strokeWidth={2.5} />
              </div>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "20px", background: "linear-gradient(135deg, #a5f3fc, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.5px" }}>
                MCPX
              </span>
            </Link>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.7, maxWidth: "260px", marginBottom: "20px" }}>
              The marketplace for Model Context Protocol servers. Discover tools that give AI agents real-world capabilities.
            </p>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <a
                href="https://github.com/TheoryofShadows/Mcp"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, background: "#1d1d2b", border: "1px solid #2e2e44", borderRadius: "8px", color: "var(--text-muted)", textDecoration: "none", transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#22d3ee"; e.currentTarget.style.color = "#a5f3fc"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2e2e44"; e.currentTarget.style.color = "var(--text-muted)"; }}
                aria-label="GitHub"
              >
                <Github size={15} />
              </a>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: "100px" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#10b981", letterSpacing: "0.05em" }}>LIVE</span>
              </div>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([heading, items]) => (
            <div key={heading}>
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-primary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "16px", fontWeight: 700 }}>
                {heading}
              </div>
              <nav aria-label={`${heading} links`}>
                {items.map(({ label, to, href }) =>
                  to ? (
                    <Link
                      key={label}
                      to={to}
                      style={linkStyle}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#a5f3fc")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                    >
                      {label}
                    </Link>
                  ) : (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={linkStyle}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#a5f3fc")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                    >
                      {label}
                    </a>
                  )
                )}
              </nav>
            </div>
          ))}
        </div>

        {/* Stats strip */}
        <div
          style={{
            padding: "20px 24px",
            background: "#12121c",
            border: "1px solid #1d1d2b",
            borderRadius: "12px",
            display: "flex",
            gap: "32px",
            flexWrap: "wrap",
            marginBottom: "32px",
          }}
        >
          {[
            { label: "MCP Servers", value: "35+" },
            { label: "Total Installs", value: "1.6M+" },
            { label: "Publisher Cut", value: "85%" },
            { label: "Platform Fee", value: "15%" },
            { label: "Stack", value: "React + Express + SQLite" },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.05em", marginBottom: "3px" }}>{label}</div>
              <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <p style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            © 2026 MCPX · MIT License · Built for the MCP ecosystem
          </p>
          <p style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            Payments by{" "}
            <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" style={{ color: "#67e8f9", textDecoration: "none" }}>Stripe Connect</a>
            {" "}· MCP by{" "}
            <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer" style={{ color: "#67e8f9", textDecoration: "none" }}>Anthropic + Linux Foundation</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
