import { TECH_STACK } from "../../data";

export default function DocsSection() {
  return (
    <section
      style={{ padding: "60px 32px", maxWidth: "900px", margin: "0 auto" }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <h2
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "36px",
            fontWeight: 800,
            letterSpacing: "-1px",
            marginBottom: "12px",
          }}
        >
          Build the{" "}
          <span style={{ color: "var(--accent-blue)" }}>Future Stack</span>
        </h2>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "16px",
            maxWidth: "500px",
            margin: "0 auto",
          }}
        >
          Everything you need to go from zero to revenue. All free and
          open-source tools.
        </p>
      </div>

      {/* Tech stack list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {TECH_STACK.map((item, i) => (
          <div
            key={i}
            className="animate-in"
            style={{
              animationDelay: `${i * 0.06}s`,
              display: "flex",
              alignItems: "center",
              gap: "20px",
              padding: "20px 24px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "14px",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                borderRadius: "10px",
                background: `linear-gradient(135deg, ${item.color}20, ${item.color}08)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                color: item.color,
              }}
            >
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "4px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: "15px",
                  }}
                >
                  {item.title}
                </span>
                <span
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    background: "var(--bg-secondary)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                  }}
                >
                  {item.tech}
                </span>
              </div>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                {item.desc}
              </p>
            </div>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "13px",
                fontWeight: 700,
                color: "var(--accent-electric)",
                whiteSpace: "nowrap",
              }}
            >
              {item.cost}
            </div>
          </div>
        ))}
      </div>

      {/* Total cost callout */}
      <div
        style={{
          marginTop: "32px",
          padding: "24px",
          background: "rgba(77, 255, 180, 0.04)",
          border: "1px solid rgba(77, 255, 180, 0.15)",
          borderRadius: "14px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "18px",
            fontWeight: 700,
            color: "var(--accent-electric)",
            marginBottom: "6px",
          }}
        >
          Total startup cost: $0
        </p>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          Scale to thousands of users before spending a single dollar. Only pay
          when you&#39;re making money.
        </p>
      </div>
    </section>
  );
}
