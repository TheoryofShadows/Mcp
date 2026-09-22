import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { JOBS, matchQuery } from "../data/jobs";
import { SEED_TOOLS } from "../data/seed";

const EXAMPLES = [
  "open pull requests",
  "query postgres",
  "drive a browser",
  "keep docs current",
  "gmail inbox",
  "hubspot crm",
];

const BOUNTY_KEY = "mcpx-bounties";

function loadBounties() {
  try {
    const raw = localStorage.getItem(BOUNTY_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function lookupTool(slug) {
  return SEED_TOOLS.find((t) => t.slug === slug) || { slug, name: slug, description: "" };
}

export default function JobSearch() {
  const [query, setQuery] = useState("");
  const [bounties, setBounties] = useState(loadBounties);
  const match = useMemo(() => matchQuery(query), [query]);

  function run(next) {
    setQuery(next);
  }

  function fileBounty(title) {
    const t = title.trim();
    if (!t || bounties.includes(t)) return;
    const next = [t, ...bounties].slice(0, 20);
    setBounties(next);
    try {
      localStorage.setItem(BOUNTY_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  }

  const tools = match.toolSlugs.map(lookupTool);

  return (
    <div style={{ textAlign: "left", maxWidth: "640px", margin: "0 auto 28px" }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "4px 4px 4px 16px",
          background: "#12121c",
          border: "1px solid #2e2e44",
          borderRadius: "12px",
        }}
      >
        <Search size={16} color="var(--text-muted)" aria-hidden="true" />
        <label htmlFor="job-query" className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
          What should your AI be able to do?
        </label>
        <input
          id="job-query"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What should your AI be able to do?"
          aria-label="What should your AI be able to do?"
          style={{
            flex: 1,
            minWidth: 0,
            height: "48px",
            background: "transparent",
            border: "none",
            color: "var(--text-primary)",
            fontSize: "15px",
            fontFamily: "var(--font-body)",
            outline: "none",
          }}
        />
      </form>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "14px" }}>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => run(ex)}
            style={{
              height: "36px",
              padding: "0 12px",
              borderRadius: "999px",
              border: "1px solid #2e2e44",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      {match.empty ? (
        <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: "20px" }}>
          {JOBS.filter((j) => j.filled).slice(0, 6).map((job) => (
            <button
              key={job.id}
              type="button"
              onClick={() => run(job.prompt)}
              style={{
                textAlign: "left",
                padding: "14px",
                borderRadius: "12px",
                border: "1px solid #1d1d2b",
                background: "#12121c",
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: 600 }}>{job.title}</div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>{job.prompt}</div>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ marginTop: "20px" }}>
          {match.job ? (
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px" }}>
              Matched job: <span style={{ color: "var(--text-primary)" }}>{match.job.title}</span>
            </p>
          ) : null}

          {tools.length > 0 ? (
            <div style={{ display: "grid", gap: "10px" }}>
              {tools.map((tool) => (
                <Link
                  key={tool.slug}
                  to={`/tool/${tool.slug}`}
                  style={{
                    display: "block",
                    padding: "14px 16px",
                    borderRadius: "12px",
                    border: "1px solid #1d1d2b",
                    background: "#12121c",
                    textDecoration: "none",
                    color: "var(--text-primary)",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "15px" }}>{tool.name || tool.slug}</div>
                  {tool.description ? (
                    <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                      {tool.description}
                    </div>
                  ) : (
                    <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                      Open listing to copy the install.
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : null}

          {match.unmatched.length > 0 ? (
            <div
              style={{
                marginTop: "14px",
                padding: "18px",
                borderRadius: "12px",
                border: "1px solid rgba(251, 191, 36, 0.25)",
                background: "rgba(251, 191, 36, 0.06)",
              }}
            >
              <div style={{ fontSize: "11px", letterSpacing: "0.08em", color: "#fbbf24", fontFamily: "var(--font-mono)" }}>
                OPEN BOUNTY
              </div>
              <h3 style={{ margin: "8px 0 6px", fontSize: "18px" }}>{match.unmatched[0].title}</h3>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                No trusted listing for this job yet. File a bounty — publishers keep 85% when they ship it.
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
                <button
                  type="button"
                  onClick={() => fileBounty(match.unmatched[0].title)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "none",
                    background: "linear-gradient(135deg, #22d3ee, #14b8a6)",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {bounties.includes(match.unmatched[0].title) ? "Bounty filed" : "File a bounty"}
                </button>
                <Link
                  to="/submit"
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px solid #2e2e44",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    textDecoration: "none",
                  }}
                >
                  I can build this
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
