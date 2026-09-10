import { Terminal, Cpu, Code2 } from "lucide-react";

/**
 * "Works with" — the MCP clients a visitor can actually install into.
 *
 * Placed directly under the hero because clients come before tools: someone
 * landing here needs to know MCPX targets *their* editor before they care
 * which servers exist. The tool chips (GitHub MCP, Postgres MCP, …) are a
 * search shortcut and answer a different, later question.
 *
 * The icons intentionally reuse the same lucide glyphs as the install tabs in
 * <InstallButtons> (Terminal / Cpu / Code2) so the mark a user sees here is the
 * mark they see again at the moment of install. Real vendor logos would be
 * better still, but a hand-drawn approximation of a brand mark reads as
 * counterfeit — these are honest, consistent, and already part of the design
 * language.
 *
 * Every client listed here is backed by a real generated config in
 * shared/installConfig.js. If that stops being true, this row must change.
 */
const CLIENTS = [
  { id: "claude", label: "Claude Desktop", Icon: Terminal },
  { id: "cursor", label: "Cursor", Icon: Cpu },
  { id: "vscode", label: "VS Code", Icon: Code2 },
];

export default function WorksWith({ style }) {
  return (
    <div
      className="works-with"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        flexWrap: "wrap",
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--font-xs, 11px)",
          letterSpacing: "1px",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        Works with
      </span>

      <ul
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
          listStyle: "none",
          margin: 0,
          padding: 0,
        }}
      >
        {CLIENTS.map(({ id, label, Icon }) => (
          <li
            key={id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "100px",
              border: "1px solid #1d1d2b",
              background: "#12121c",
              color: "var(--text-secondary)",
              fontSize: "13px",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            <Icon size={14} aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
