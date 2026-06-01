import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchServer, postReview, recordInstall } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { Badge } from "../components/ui";
import InstallButtons from "../components/InstallButtons";
import CapabilitiesWarning from "../components/CapabilitiesWarning";
import VerifiedBadge from "../components/VerifiedBadge";
import TrustScore from "../components/TrustScore";

export default function ServerDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [server, setServer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchServer(slug)
      .then(setServer)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleInstall() {
    setInstalled(true);
    setServer((s) => s && { ...s, installs: s.installs + 1 });
    try {
      await recordInstall(slug);
    } catch { /* install is best-effort */ }
  }

  async function handleReview(e) {
    e.preventDefault();
    setReviewError("");
    setReviewSubmitting(true);
    try {
      const review = await postReview(slug, reviewRating, reviewComment);
      setServer((s) => s && {
        ...s,
        reviews: [review, ...(s.reviews || [])],
        rating_count: s.rating_count + 1,
      });
      setReviewComment("");
      setReviewRating(5);
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "80px var(--section-px)", textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)" }}>
        Loading...
      </div>
    );
  }

  if (error || !server) {
    return (
      <div style={{ padding: "80px var(--section-px)", textAlign: "center" }}>
        <p style={{ color: "var(--accent-pink)", fontFamily: "var(--font-mono)", fontSize: "var(--font-md)", marginBottom: "var(--space-md)" }}>
          {error || "Server not found"}
        </p>
        <button className="btn btn-outline-green" onClick={() => navigate("/")}>
          Back to Marketplace
        </button>
      </div>
    );
  }

  const alreadyReviewed = server.reviews?.some((r) => r.username === user?.username);

  return (
    <section style={{ padding: "40px var(--section-px)", maxWidth: "900px", margin: "0 auto" }}>
      {/* Back button */}
      <button
        onClick={() => navigate("/")}
        style={{
          background: "none",
          border: "none",
          color: "var(--text-muted)",
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--font-sm)",
          marginBottom: "var(--space-lg)",
          padding: 0,
        }}
      >
        {"\u2190"} Back to Marketplace
      </button>

      {/* Header */}
      <div style={{ display: "flex", gap: "var(--space-md)", alignItems: "flex-start", marginBottom: "var(--space-xl)", flexWrap: "wrap" }}>
        <div
          aria-hidden="true"
          style={{
            width: 64, height: 64, borderRadius: "var(--radius-lg)",
            background: server.gradient, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "28px", fontWeight: 700, color: "var(--bg-primary)", fontFamily: "var(--font-mono)", flexShrink: 0,
          }}
        >
          {server.name.charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-xs)", flexWrap: "wrap" }}>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--font-2xl)", fontWeight: 800, letterSpacing: "-0.5px" }}>
              {server.name}
            </h1>
            {server.verified && <VerifiedBadge verified={server.verified} size="md" />}
            {server.trending && <Badge variant="trending">Trending</Badge>}
            <Badge variant={server.price_type === "free" ? "free" : "paid"}>
              {server.price}
            </Badge>
          </div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)", color: "var(--text-muted)", marginBottom: "var(--space-sm)" }}>
            by @{server.author} &middot; {server.category_label}
          </p>
          <p style={{ fontSize: "var(--font-md)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {server.description}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: "flex", gap: "var(--space-lg)", marginBottom: "var(--space-xl)",
        padding: "var(--space-md) var(--space-lg)",
        background: "var(--bg-card)", borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-subtle)", flexWrap: "wrap",
      }}>
        {[
          { label: "Installs", value: (server.installs / 1000).toFixed(1) + "K", color: "var(--text-primary)" },
          { label: "Rating", value: `${server.rating} \u2605 (${server.rating_count})`, color: "var(--accent-electric)" },
          { label: "Weekly Growth", value: server.weeklyGrowth, color: "var(--accent-electric)" },
          ...(server.revenue ? [{ label: "Revenue", value: server.revenue, color: "var(--accent-purple)" }] : []),
        ].map((s) => (
          <div key={s.label} style={{ textAlign: "center", flex: 1, minWidth: "100px" }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "var(--font-xl)", fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "2px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tags */}
      <div style={{ display: "flex", gap: "var(--space-sm)", marginBottom: "var(--space-xl)", flexWrap: "wrap" }}>
        {server.tags.map((tag) => (
          <span key={tag} className="tag" style={{ fontSize: "var(--font-sm)", padding: "4px 12px" }}>#{tag}</span>
        ))}
      </div>

      {/* Install button */}
      <div style={{ display: "flex", gap: "var(--space-sm)", marginBottom: "var(--space-lg)", flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={handleInstall} disabled={installed}>
          {installed ? "Installed \u2713" : "Track Install"}
        </button>
        {server.repo_url && (
          <a
            href={server.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ textDecoration: "none" }}
          >
            View Source {"\u2192"}
          </a>
        )}
      </div>

      {/* One-click install commands */}
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <InstallButtons server={server} />
      </div>

      {/* Trust Score — computed, transparent trust report */}
      {server.trust && <TrustScore trust={server.trust} />}

      {/* Capabilities & risk warnings */}
      {(server.capabilities?.length > 0 || server.risk_level) && (
        <div style={{ marginBottom: "var(--space-xl)" }}>
          <CapabilitiesWarning
            capabilities={server.capabilities}
            riskLevel={server.risk_level}
          />
        </div>
      )}

      {/* Long description */}
      {server.long_description && (
        <div style={{ marginBottom: "var(--space-xl)" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--font-xl)", fontWeight: 700, marginBottom: "var(--space-sm)" }}>About</h2>
          <p style={{ fontSize: "var(--font-md)", color: "var(--text-secondary)", lineHeight: 1.7 }}>{server.long_description}</p>
        </div>
      )}

      {/* Reviews */}
      <div>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--font-xl)", fontWeight: 700, marginBottom: "var(--space-md)" }}>
          Reviews ({server.reviews?.length || 0})
        </h2>

        {/* Review form */}
        {user && !alreadyReviewed && server.author !== user.username && (
          <form onSubmit={handleReview} style={{
            padding: "var(--space-md)", background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)", marginBottom: "var(--space-md)",
            display: "flex", flexDirection: "column", gap: "var(--space-sm)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
              <label style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Rating
              </label>
              <select
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
                style={{
                  background: "var(--bg-secondary)", color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)",
                  padding: "var(--space-xs) var(--space-sm)", fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)",
                }}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{"\u2605".repeat(n)}</option>
                ))}
              </select>
            </div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Write your review..."
              rows={3}
              style={{
                width: "100%", resize: "vertical",
                padding: "var(--space-sm) var(--space-md)",
                background: "var(--bg-secondary)", color: "var(--text-primary)",
                border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)",
                fontFamily: "var(--font-body)", fontSize: "var(--font-md)", outline: "none",
              }}
            />
            {reviewError && <p style={{ color: "var(--accent-pink)", fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)" }}>{reviewError}</p>}
            <button type="submit" className="btn btn-gradient" disabled={reviewSubmitting} style={{ alignSelf: "flex-start" }}>
              {reviewSubmitting ? "Submitting..." : "Submit Review"}
            </button>
          </form>
        )}

        {/* Review list */}
        {server.reviews?.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {server.reviews.map((r) => (
              <div key={r.id} style={{
                padding: "var(--space-md)", background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-xs)" }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "var(--font-md)" }}>
                    @{r.username}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)", color: "var(--accent-electric)" }}>
                    {"\u2605".repeat(r.rating)}
                  </span>
                </div>
                {r.comment && (
                  <p style={{ fontSize: "var(--font-base)", color: "var(--text-secondary)", lineHeight: 1.6 }}>{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)" }}>
            No reviews yet. Be the first to review this server.
          </p>
        )}
      </div>
    </section>
  );
}
