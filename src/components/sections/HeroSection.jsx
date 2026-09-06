import { useMemo } from "react";
import { Link } from "react-router-dom";
import { GlowOrb } from "../ui";
import { useStats } from "../../hooks/useStats";

const ORBIT_COUNT = 5;

export default function HeroSection() {
  const { stats } = useStats();
  const heroStats = stats?.hero_stats || [];

  const orbitDots = useMemo(
    () =>
      Array.from({ length: ORBIT_COUNT }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="will-transform"
          style={{
            position: "absolute",
            width: 6, height: 6, borderRadius: "50%",
            background: i % 2 === 0 ? "var(--accent-electric)" : "var(--accent-purple)",
            animation: `orbit ${12 + i * 3}s linear infinite`,
            animationDelay: `${i * 2.4}s`,
            opacity: 0.4,
          }}
        />
      )),
    []
  );

  return (
    <section
      className="hero-section"
      style={{ position: "relative", padding: "100px var(--section-px) 80px", textAlign: "center", overflow: "hidden" }}
    >
      <div className="hero-orbs" aria-hidden="true">
        <GlowOrb color="var(--accent-electric)" size="400px" top="-100px" left="10%" delay={0} />
        <GlowOrb color="var(--accent-purple)" size="350px" top="50px" left="70%" delay={1.5} />
        <GlowOrb color="var(--accent-blue)" size="300px" top="200px" left="40%" delay={3} />
      </div>

      <div className="hero-orbits will-transform" aria-hidden="true" style={{ position: "absolute", top: "50%", left: "50%", width: 0, height: 0, animation: "counter-spin 20s linear infinite", pointerEvents: "none" }}>
        {orbitDots}
      </div>

      <div className="animate-in" style={{ position: "relative", zIndex: "var(--z-card)" }}>
        <div aria-live="polite" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-sm)", padding: "6px 16px", background: "rgba(34, 211, 238, 0.08)", border: "1px solid rgba(34, 211, 238, 0.2)", borderRadius: "30px", marginBottom: "28px" }}>
          <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-light)", boxShadow: "0 0 8px var(--accent)", animation: "pulse-glow 2s ease-in-out infinite" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)", color: "var(--accent-light)", letterSpacing: "1px" }}>
            TRUST SCORE · 85% PAYOUTS · ONE-CLICK INSTALL
          </span>
        </div>

        <h1 className="hero-heading" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(40px, 6vw, 76px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-2px", maxWidth: "800px", margin: "0 auto 20px" }}>
          <span>The trusted marketplace for</span>
          <br />
          <span style={{ background: "linear-gradient(135deg, var(--accent-electric), var(--accent-blue), var(--accent-purple))", backgroundSize: "200% 200%", animation: "gradient-shift 4s ease infinite", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            MCP tools
          </span>
        </h1>

        <p style={{ fontSize: "var(--font-xl)", color: "var(--text-secondary)", maxWidth: "560px", margin: "0 auto 36px", lineHeight: 1.7, fontWeight: 300 }}>
          Computed Trust Scores. Stripe Connect payouts (publishers keep 85%).
          One-click install for Claude, Cursor, and VS Code.
        </p>

        <div className="hero-cta" style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/submit" className="btn btn-primary" style={{ textDecoration: "none" }}>
            Publish a tool — keep 85%
          </Link>
          <Link to="/marketplace" className="btn btn-secondary" style={{ textDecoration: "none" }}>
            Browse Marketplace {"\u2192"}
          </Link>
        </div>

        {heroStats.length > 0 && (
          <dl className="hero-stats" style={{ display: "flex", gap: "40px", justifyContent: "center", marginTop: "50px", padding: "20px", flexWrap: "wrap" }}>
            {heroStats.map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <dt style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", color: "var(--text-muted)", letterSpacing: "1px", textTransform: "uppercase", order: 2 }}>
                  {s.label}
                </dt>
                <dd style={{ fontFamily: "var(--font-heading)", fontSize: "28px", fontWeight: 800, color: s.color, letterSpacing: "-1px", marginLeft: 0 }}>
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
