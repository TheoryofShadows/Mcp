import { Upload, ShieldCheck, Store, AlertCircle } from "lucide-react";

/**
 * "What happens after you submit" — the publisher-side timeline.
 *
 * The publish flow is genuinely good (auto source scan, computed Trust Score,
 * Stripe Connect destination charges paying out 85%), but /submit never said
 * any of it. A publisher decided whether to list here with no idea what came
 * next. People publish where they can see status and money.
 *
 * Every claim below is deliberately matched to real behaviour:
 *   - Listings are created with status 'active' (server/routes/servers.js), so
 *     there is NO approval queue and we must not imply one. It goes live at once.
 *   - scheduleScan() is fire-and-forget and needs a repo_url, so scoring is
 *     "shortly after" — never instant, and skipped without a repo.
 *   - Paid listings only become purchasable once Stripe Connect onboarding is
 *     done (server/lib/purchasable.js), which is why payouts are called out as
 *     a prerequisite rather than an afterthought.
 *
 * If any of that changes, this component is wrong and must change with it.
 */
const STEPS = [
  {
    id: "submit",
    Icon: Upload,
    title: "Submit",
    body: "Paste your repo URL and we prefill the details. No review queue — your listing goes live immediately.",
  },
  {
    id: "score",
    Icon: ShieldCheck,
    title: "Scored",
    body: "We scan your source and compute a Trust Score from provenance, license, adoption and risk. Runs automatically, shortly after you submit.",
  },
  {
    id: "listed",
    Icon: Store,
    title: "Listed & earning",
    body: "Your server is discoverable right away. Connect Stripe to sell it — payouts are 85% to you, split at the moment of payment.",
  },
];

export default function PublishPipeline({ style }) {
  return (
    <section
      aria-labelledby="publish-pipeline-heading"
      style={{
        border: "1px solid #1d1d2b",
        borderRadius: "14px",
        background: "#0f0f18",
        padding: "20px",
        ...style,
      }}
    >
      <h2
        id="publish-pipeline-heading"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--font-xs, 11px)",
          letterSpacing: "1px",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          margin: "0 0 16px",
          fontWeight: 500,
        }}
      >
        What happens after you submit
      </h2>

      <ol
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          listStyle: "none",
          margin: 0,
          padding: 0,
          counterReset: "publish-step",
        }}
      >
        {STEPS.map(({ id, Icon, title, body }, i) => (
          <li key={id} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <span
              aria-hidden="true"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: "8px",
                background: "rgba(34, 211, 238, 0.08)",
                border: "1px solid rgba(34, 211, 238, 0.2)",
                color: "#67e8f9",
                flexShrink: 0,
              }}
            >
              <Icon size={14} />
            </span>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "6px",
                  marginBottom: "3px",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    color: "var(--text-muted)",
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary, #fff)" }}>
                  {title}
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  lineHeight: 1.55,
                  color: "var(--text-secondary)",
                }}
              >
                {body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "6px",
          margin: "16px 0 0",
          fontSize: "12px",
          lineHeight: 1.5,
          color: "var(--text-muted)",
        }}
      >
        <AlertCircle size={13} style={{ flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
        <span>
          Scoring needs a public repository. Without one your listing still goes
          live, but it starts without source-provenance points.
        </span>
      </p>
    </section>
  );
}
