import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader, AlertCircle, Zap, Shield, CheckCircle, Mail, Lock, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const PERKS = [
  "Publish and monetize MCP tools",
  "Earn 85% of subscription revenue",
  "Track installs, revenue, and subscribers",
  "Automatic monthly payouts via Stripe",
];

export default function Login() {
  const { user, login: authLogin, register: authRegister } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isRegister) {
        if (!username.trim()) { setError("Username is required"); setLoading(false); return; }
        await authRegister(email, username, password);
      } else {
        await authLogin(email, password);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "12px 14px 12px 42px",
    background: "#0d0d0d",
    border: "1px solid #2a2a2a",
    borderRadius: "10px",
    color: "var(--text-primary)",
    fontSize: "14px",
    fontFamily: "var(--font-body)",
    outline: "none",
    transition: "border-color 0.15s",
  };

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

      <div style={{ width: "100%", maxWidth: "400px", position: "relative" }}>
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
            {isRegister ? "Create an account" : "Sign in to MCPX"}
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
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
            {isRegister && (
              <div style={{ position: "relative" }}>
                <User size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  required={isRegister}
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
                />
              </div>
            )}
            <div style={{ position: "relative" }}>
              <Mail size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
              />
            </div>
            <div style={{ position: "relative" }}>
              <Lock size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={6}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                background: loading ? "#1e1e1e" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "15px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                fontFamily: "var(--font-body)",
                boxShadow: loading ? "none" : "0 0 24px rgba(99,102,241,0.3)",
              }}
            >
              {loading && <Loader size={18} style={{ animation: "spin 1s linear infinite" }} />}
              {loading ? "Please wait…" : isRegister ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <button
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
              style={{
                background: "none",
                border: "none",
                color: "#818cf8",
                fontSize: "13px",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
              }}
            >
              {isRegister ? "Already have an account? Sign in" : "Need an account? Register"}
            </button>
          </div>

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
              <strong style={{ color: "#a5b4fc" }}>Demo:</strong> Use{" "}
              <code style={{ background: "#1a1a1a", padding: "1px 5px", borderRadius: "4px" }}>dev@mcpx.dev</code> /{" "}
              <code style={{ background: "#1a1a1a", padding: "1px 5px", borderRadius: "4px" }}>demo1234</code> to try the dashboard.
            </p>
          </div>
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
            Secured with JWT authentication
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
