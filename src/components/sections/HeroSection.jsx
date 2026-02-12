import { useState, useEffect, useMemo } from "react";
import { GlowOrb } from "../ui";

const HERO_STATS = [
  { label: "Monthly Installs", value: "2.1M+", color: "var(--accent-electric)" },
  { label: "Active Publishers", value: "4,200+", color: "var(--accent-blue)" },
  { label: "Revenue Shared", value: "$840K", color: "var(--accent-purple)" },
];

const PUBLISH_COUNT_TARGET = 2847;
const ANIMATION_FRAMES = 60;
const COUNTER_INTERVAL_MS = 25;
const ORBIT_COUNT = 5;

export default function HeroSection() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const step = Math.ceil(PUBLISH_COUNT_TARGET / ANIMATION_FRAMES);
    const timer = setInterval(() => {
      setCount((c) => {
        if (c + step >= PUBLISH_COUNT_TARGET) {
          clearInterval(timer);
          return PUBLISH_COUNT_TARGET;
        }
        return c + step;
      });
    }, COUNTER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const orbitDots = useMemo(
    () =>
      Array.from({ length: ORBIT_COUNT }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="will-transform"
          style={{
            position: "absolute",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background:
              i % 2 === 0 ? "var(--accent-electric)" : "var(--accent-purple)",
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
      style={{
        position: "relative",
        padding: "100px var(--section-px) 80px",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      {/* Background glow orbs */}
      <div className="hero-orbs" aria-hidden="true">
        <GlowOrb color="var(--accent-electric)" size="400px" top="-100px" left="10%" delay={0} />
        <GlowOrb color="var(--accent-purple)" size="350px" top="50px" left="70%" delay={1.5} />
        <GlowOrb color="var(--accent-blue)" size="300px" top="200px" left="40%" delay={3} />
      </div>

      {/* Orbiting elements */}
      <div
        className="hero-orbits will-transform"
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 0,
          height: 0,
          animation: "counter-spin 20s linear infinite",
          pointerEvents: "none",
        }}
      >
        {orbitDots}
      </div>

      {/* Content */}
      <div className="animate-in" style={{ position: "relative", zIndex: "var(--z-card)" }}>
        {/* Server count badge */}
        <div
          aria-live="polite"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-sm)",
            padding: "6px 16px",
            background: "rgba(77, 255, 180, 0.06)",
            border: "1px solid rgba(77, 255, 180, 0.15)",
            borderRadius: "30px",
            marginBottom: "28px",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--accent-electric)",
              animation: "pulse-glow 2s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-sm)",
              color: "var(--accent-electric)",
              letterSpacing: "1px",
            }}
          >
            {count.toLocaleString()} MCP SERVERS PUBLISHED
          </span>
        </div>

        {/* Heading */}
        <h1
          className="hero-heading"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(40px, 6vw, 76px)",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-2px",
            maxWidth: "800px",
            margin: "0 auto 20px",
          }}
        >
          <span>The App Store for</span>
          <br />
          <span
            style={{
              background:
                "linear-gradient(135deg, var(--accent-electric), var(--accent-blue), var(--accent-purple))",
              backgroundSize: "200% 200%",
              animation: "gradient-shift 4s ease infinite",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            AI Agent Tools
          </span>
        </h1>

        {/* Subheading */}
        <p
          style={{
            fontSize: "var(--font-xl)",
            color: "var(--text-secondary)",
            maxWidth: "560px",
            margin: "0 auto 36px",
            lineHeight: 1.7,
            fontWeight: 300,
          }}
        >
          Publish, discover, and monetize MCP servers. Build the tools that make
          AI agents actually useful — and get paid every time they&#39;re used.
        </p>

        {/* CTA buttons */}
        <div className="hero-cta" style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary">
            Start Publishing — Free
          </button>
          <button className="btn btn-secondary">
            Browse Marketplace {"\u2192"}
          </button>
        </div>

        {/* Stats */}
        <dl
          className="hero-stats"
          style={{
            display: "flex",
            gap: "40px",
            justifyContent: "center",
            marginTop: "50px",
            padding: "20px",
            flexWrap: "wrap",
          }}
        >
          {HERO_STATS.map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <dt
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--font-xs)",
                  color: "var(--text-muted)",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  order: 2,
                }}
              >
                {s.label}
              </dt>
              <dd
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "28px",
                  fontWeight: 800,
                  color: s.color,
                  letterSpacing: "-1px",
                  marginLeft: 0,
                }}
              >
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
