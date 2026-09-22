import { Link } from "react-router-dom";

const DAYS = [
  {
    day: "1",
    title: "One domain, one job box",
    body: "Collapse mcpx.shop, mcpx.digital, and the hoped-for mcpx.com into a single front door: job in, trusted install out. Two sites with mismatched catalog sizes confuse crawlers and buyers.",
  },
  {
    day: "2",
    title: "Ship the meta-MCP as the product",
    body: "Make `npx -y @mcpx-digital/mcp` the only hero command. Humans convert once. Agents convert forever. Trust Score is the gate.",
  },
  {
    day: "3",
    title: "Twenty publishers, not twenty thousand servers",
    body: "DM the authors of GitHub, Playwright, Context7, Firecrawl, Exa, Tavily, Stripe, Notion, Sentry, Supabase, Grafana. Pitch: claim the listing, connect Stripe, keep 85%.",
  },
  {
    day: "4",
    title: "Execute the launch kit you already wrote",
    body: "Show HN, Product Hunt, r/ClaudeAI, r/LocalLLaMA, Cursor forum, MCP Discord — copy is in docs/LAUNCH.md. Honest zeros. Lead with CVEs and capability risk, not catalog size.",
  },
  {
    day: "5",
    title: "Get indexed where agents already look",
    body: "Submit the MCPX gateway to the Official MCP Registry, awesome-mcp-servers, PulseMCP, Smithery, Glama. Appear as the trust/settlement layer they link out to.",
  },
  {
    day: "6",
    title: "Index jobs, not listings",
    body: "Public pages for “MCP to open GitHub PRs,” “MCP to query Postgres,” “MCP to drive a browser.” Each page is a job + Trust Score + copy-paste install.",
  },
  {
    day: "7",
    title: "Measure the loop, not the landing",
    body: "Count gateway installs, copy-install events, publisher Connect completions, unmatched job queries. If gateway installs are zero, the homepage is still a brochure.",
  },
];

export default function Playbook() {
  return (
    <main id="main-content" style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 24px 80px" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.16em", color: "#67e8f9" }}>
        GO TO MARKET
      </p>
      <h1
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(32px, 5vw, 48px)",
          letterSpacing: "-1.4px",
          margin: "12px 0 16px",
        }}
      >
        How MCPX actually pulls customers
      </h1>
      <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "16px" }}>
        You cannot out-catalog Glama, PulseMCP, or mcp.so. The directory is customer
        acquisition; the company is trust, routing, and settlement. This week is about
        wiring acquisition to that thesis.
      </p>

      <ol style={{ listStyle: "none", padding: 0, margin: "36px 0", display: "grid", gap: "22px" }}>
        {DAYS.map((d) => (
          <li key={d.day} style={{ display: "grid", gridTemplateColumns: "48px 1fr", gap: "16px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "#67e8f9" }}>D{d.day}</div>
            <div>
              <h2 style={{ fontSize: "18px", margin: "0 0 8px" }}>{d.title}</h2>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.7 }}>{d.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link to="/" className="btn btn-primary" style={{ textDecoration: "none" }}>
          Try the job box
        </Link>
        <Link to="/submit" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          Publisher pitch
        </Link>
      </div>
    </main>
  );
}
