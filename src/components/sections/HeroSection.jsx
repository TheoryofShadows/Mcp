import { useState, useEffect } from "react";
import { GlowOrb } from "../ui";

const HERO_STATS = [
  { label: "Monthly Installs", value: "2.1M+", color: "var(--accent-electric)" },
  { label: "Active Publishers", value: "4,200+", color: "var(--accent-blue)" },
  { label: "Revenue Shared", value: "$840K", color: "var(--accent-purple)" },
];

const PUBLISH_COUNT_TARGET = 2847;

export default function HeroSection() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const step = Math.ceil(PUBLISH_COUNT_TARGET / 60);
    const timer = setInterval(() => {
      setCount((c) => {
        if (c + step >= PUBLISH_COUNT_TARGET) {
          clearInterval(timer);
          return PUBLISH_COUNT_TARGET;
        }
        return c + step;
      });
    }, 25);
    return () => clearInterval(timer);
  }, []);

  return (
    <section
      style={{
        position: "relative",
        padding: "100px 32px 80px",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      {/* Background glow orbs */}
      <GlowOrb color="var(--accent-electric)" size="400px" top="-100px" left="10%" delay={0} />
      <GlowOrb color="var(--accent-purple)" size="350px" top="50px" left="70%" delay={1.5} />
      <GlowOrb color="var(--accent-blue)" size="300px" top="200px" left="40%" delay={3} />

      {/* Orbiting elements */}
      <div
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
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background:
                i % 2 === 0
                  ? "var(--accent-electric)"
                  : "var(--accent-purple)",
              animation: `orbit ${12 + i * 3}s linear infinite`,
              animationDelay: `${i * 2.4}s`,
              opacity: 0.4,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="animate-in" style={{ position: "relative", zIndex: 2 }}>
        {/* Server count badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 16px",
            background: "rgba(77, 255, 180, 0.06)",
            border: "1px solid rgba(77, 255, 180, 0.15)",
            borderRadius: "30px",
            marginBottom: "28px",
          }}
        >
          <span
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
              fontFamily: "'Space Mono', monospace",
              fontSize: "12px",
              color: "var(--accent-electric)",
              letterSpacing: "1px",
            }}
          >
            {count.toLocaleString()} MCP SERVERS PUBLISHED
          </span>
        </div>

        {/* Heading */}
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(40px, 6vw, 76px)",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-2px",
            maxWidth: "800px",
            margin: "0 auto 20px",
          }}
        >
          <span style={{ color: "var(--text-primary)" }}>The App Store for</span>
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
            fontSize: "18px",
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
        <div
          style={{
            display: "flex",
            gap: "14px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            style={{
              padding: "14px 32px",
              borderRadius: "12px",
              border: "none",
              background:
                "linear-gradient(135deg, var(--accent-electric), var(--accent-blue))",
              color: "var(--bg-primary)",
              cursor: "pointer",
              fontFamily: "'Syne', sans-serif",
              fontSize: "16px",
              fontWeight: 700,
              letterSpacing: "-0.3px",
              boxShadow: "0 0 30px rgba(77, 255, 180, 0.2)",
              transition: "all 0.3s ease",
            }}
          >
            Start Publishing — Free
          </button>
          <button
            style={{
              padding: "14px 32px",
              borderRadius: "12px",
              border: "1px solid var(--border-accent)",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              cursor: "pointer",
              fontFamily: "'Syne', sans-serif",
              fontSize: "16px",
              fontWeight: 600,
            }}
          >
            Browse Marketplace →
          </button>
        </div>

        {/* Stats */}
        <div
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
              <div
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "28px",
                  fontWeight: 800,
                  color: s.color,
                  letterSpacing: "-1px",
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  letterSpacing: "1px",
                  marginTop: "4px",
                  textTransform: "uppercase",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
