export default function CollectionCard({ collection, onClick }) {
  const { title, description, total, servers = [] } = collection;

  return (
    <button
      onClick={onClick}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-xl)",
        padding: "20px",
        textAlign: "left",
        cursor: "pointer",
        width: "240px",
        flexShrink: 0,
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(77, 255, 180, 0.4)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
    >
      {/* Gradient previews */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "14px" }}>
        {servers.slice(0, 4).map((s) => (
          <div
            key={s.slug}
            aria-hidden="true"
            style={{
              width: 32, height: 32, borderRadius: "8px",
              background: s.gradient || "var(--bg-secondary)",
              flexShrink: 0,
            }}
          />
        ))}
        {servers.length === 0 && (
          <div style={{ width: 32, height: 32, borderRadius: "8px", background: "var(--bg-secondary)" }} />
        )}
      </div>

      <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", marginBottom: "10px", lineHeight: 1.4 }}>
          {description}
        </div>
      )}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", color: "var(--accent-electric)" }}>
        {total} {total === 1 ? "server" : "servers"}
      </div>
    </button>
  );
}
