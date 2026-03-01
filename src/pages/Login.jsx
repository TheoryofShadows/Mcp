import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Github, Loader, AlertCircle, Zap, Shield, CheckCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { supabase, isSupabaseEnabled } from "../lib/supabase";

const PERKS = [
  "Publish and monetize MCP tools",
  "Earn 85% of subscription revenue",
  "Track installs, revenue, and subscribers",
  "Automatic monthly payouts via Stripe",
];

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  async function handleGitHubLogin() {
    if (!isSupabaseEnabled) {
      setError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          scopes: "read:user user:email",
        },
      });
      if (authError) throw authError;
      // Redirect happens via browser
    } catch (err) {
      setError(err.message || "GitHub login failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main
      id="main-content"
      style={{
        minHeight: "calc(100vh - 60px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}
    >
      {/* Background glow */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "500px",
          height: "500px",
          background: "radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          position: "relative",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 0 32px rgba(99,102,241,0.3)",
            }}
          >
            <Zap size={26} color="#fff" />
          </div>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 800,
              fontSize: "26px",
              letterSpacing: "-0.5px",
              marginBottom: "8px",
            }}
          >
            Sign in to MCPX
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.6 }}>
            Publish tools. Earn revenue. Build for Claude.
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "#111",
            border: "1px solid #1e1e1e",
            borderRadius: "18px",
            padding: "32px",
            marginBottom: "20px",
          }}
        >
          {/* GitHub OAuth button */}
          <button
            onClick={handleGitHubLogin}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: loading ? "#1e1e1e" : "#f0f0f0",
              border: "none",
              borderRadius: "12px",
              color: "#0a0a0a",
              fontSize: "15px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              marginBottom: "24px",
              transition: "all 0.15s",
              fontFamily: "var(--font-body)",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = loading ? "#1e1e1e" : "#f0f0f0";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {loading ? (
              <Loader size={18} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Github size={18} />
            )}
            {loading ? "Redirecting to GitHub…" : "Continue with GitHub"}
          </button>

          {/* Perks */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {PERKS.map((perk) => (
              <div
                key={perk}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                }}
              >
                <CheckCircle size={14} color="#6366f1" style={{ flexShrink: 0 }} />
                {perk}
              </div>
            ))}
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
                padding: "14px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "10px",
                marginTop: "20px",
              }}
            >
              <AlertCircle size={15} color="#f87171" style={{ flexShrink: 0, marginTop: "1px" }} />
              <p style={{ fontSize: "13px", color: "#f87171", lineHeight: 1.5 }}>{error}</p>
            </div>
          )}

          {!isSupabaseEnabled && (
            <div
              style={{
                padding: "14px",
                background: "rgba(99,102,241,0.07)",
                border: "1px solid rgba(99,102,241,0.15)",
                borderRadius: "10px",
                marginTop: "20px",
              }}
            >
              <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.65, fontFamily: "var(--font-mono)" }}>
                <strong style={{ color: "#a5b4fc" }}>Demo mode:</strong> Supabase not configured.
                Copy <code style={{ background: "#1a1a1a", padding: "1px 5px", borderRadius: "4px" }}>.env.example</code> to{" "}
                <code style={{ background: "#1a1a1a", padding: "1px 5px", borderRadius: "4px" }}>.env</code> and add your Supabase keys.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              fontSize: "12px",
              color: "var(--text-muted)",
            }}
          >
            <Shield size={12} />
            Secured by Supabase Auth &amp; GitHub OAuth
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            By signing in you agree to our{" "}
            <Link to="/" style={{ color: "#818cf8", textDecoration: "none" }}>Terms</Link>
            {" "}and{" "}
            <Link to="/" style={{ color: "#818cf8", textDecoration: "none" }}>Privacy Policy</Link>
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Just browsing?{" "}
            <Link to="/marketplace" style={{ color: "#818cf8", textDecoration: "none" }}>
              Explore marketplace →
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
