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

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  background: "#0d0d0d",
  border: "1px solid #2a2a2a",
  borderRadius: "10px",
  color: "#fff",
  fontSize: "14px",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  fontSize: "11px",
  fontFamily: "var(--font-mono)",
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  display: "block",
  marginBottom: "6px",
};

export default function Login() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(() => {
    // Surface errors forwarded back from /auth/callback (e.g. Safari PKCE failure)
    const params = new URLSearchParams(window.location.search);
    return params.get("error") ? decodeURIComponent(params.get("error")) : "";
  });
  const [loading, setLoading] = useState(false);

  // Email/password form state (used when Supabase not configured)
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

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
          redirectTo: `${window.location.origin}/auth/callback`,
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

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, username, password);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
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
            {isSupabaseEnabled ? "Sign in to MCPX" : mode === "login" ? "Welcome back" : "Create account"}
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
          {isSupabaseEnabled ? (
            <>
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
            </>
          ) : (
            <>
              {/* Email / password form (shown when Supabase is not configured) */}
              <form onSubmit={handleEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label htmlFor="login-email" style={labelStyle}>Email</label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dev@mcpx.dev"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
                  />
                </div>

                {mode === "register" && (
                  <div>
                    <label htmlFor="login-username" style={labelStyle}>Username</label>
                    <input
                      id="login-username"
                      type="text"
                      required
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="cooldev42"
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                      onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="login-password" style={labelStyle}>Password</label>
                  <input
                    id="login-password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "13px",
                    background: loading ? "#1e1e1e" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    border: "none",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "15px",
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "var(--font-body)",
                    transition: "all 0.15s",
                  }}
                >
                  {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
                </button>

                <p style={{ textAlign: "center", fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
                  {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#818cf8",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 600,
                      padding: 0,
                      textDecoration: "underline",
                      textUnderlineOffset: "2px",
                    }}
                  >
                    {mode === "login" ? "Sign up" : "Sign in"}
                  </button>
                </p>

                <div
                  style={{
                    padding: "10px 14px",
                    background: "rgba(99,102,241,0.07)",
                    border: "1px solid rgba(99,102,241,0.15)",
                    borderRadius: "10px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    textAlign: "center",
                  }}
                >
                  Demo: <strong style={{ color: "#a5b4fc" }}>dev@mcpx.dev</strong> / <strong style={{ color: "#a5b4fc" }}>demo1234</strong>
                </div>
              </form>
            </>
          )}

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
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "12px" }}>
          {isSupabaseEnabled && (
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
          )}
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
