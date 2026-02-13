import { useTiers } from "../../hooks/useTiers";

export default function DocsSection() {
  const { tech_stack, loading } = useTiers();

  if (loading) {
    return (
      <div style={{ padding: "80px var(--section-px)", textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)" }}>
        Loading...
      </div>
    );
  }

  return (
    <section
      aria-label="Tech stack documentation"
      style={{
        padding: "60px var(--section-px)",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "var(--space-2xl)" }}>
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "var(--font-4xl)",
            fontWeight: 800,
            letterSpacing: "-1px",
            marginBottom: "var(--space-sm)",
          }}
        >
          Build the{" "}
          <span style={{ color: "var(--accent-blue)" }}>Future Stack</span>
        </h2>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "var(--font-lg)",
            maxWidth: "500px",
            margin: "0 auto",
          }}
        >
          Everything you need to go from zero to revenue. All free and
          open-source tools.
        </p>
      </div>

      {/* Tech stack list */}
      {tech_stack.length > 0 && (
        <div
          role="list"
          aria-label="Technology stack"
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}
        >
          {tech_stack.map((item, i) => (
            <div
              key={i}
              role="listitem"
              className="stack-item animate-in"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div
                aria-hidden="true"
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
                    gap: "var(--space-sm)",
                    marginBottom: "var(--space-xs)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontWeight: 700,
                      fontSize: "15px",
                    }}
                  >
                    {item.title}
                  </span>
                  <span className="tag">{item.tech}</span>
                </div>
                <p
                  style={{
                    fontSize: "var(--font-base)",
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {item.desc}
                </p>
              </div>
              <div
                className="stack-item-cost"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--font-base)",
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
      )}

      {/* Total cost callout */}
      <div
        role="status"
        style={{
          marginTop: "var(--space-xl)",
          padding: "var(--space-lg)",
          background: "rgba(77, 255, 180, 0.04)",
          border: "1px solid rgba(77, 255, 180, 0.15)",
          borderRadius: "14px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "var(--font-xl)",
            fontWeight: 700,
            color: "var(--accent-electric)",
            marginBottom: "6px",
          }}
        >
          Total startup cost: $0
        </p>
        <p style={{ fontSize: "var(--font-base)", color: "var(--text-secondary)" }}>
          Scale to thousands of users before spending a single dollar. Only pay
          when you&#39;re making money.
        </p>
      </div>
    </section>
  );
}
