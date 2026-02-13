import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function AuthModal({ onClose }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, username, password);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === "login" ? "Sign in" : "Create account"}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-modal)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-md)",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <form
        onSubmit={handleSubmit}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "400px",
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-xl)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-md)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "var(--space-md)",
            right: "var(--space-md)",
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "20px",
            cursor: "pointer",
          }}
        >
          {"\u2715"}
        </button>

        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "var(--font-2xl)",
            fontWeight: 800,
            letterSpacing: "-0.5px",
          }}
        >
          {mode === "login" ? "Welcome back" : "Create account"}
        </h2>

        {error && (
          <div
            role="alert"
            style={{
              padding: "var(--space-sm) var(--space-md)",
              background: "rgba(255, 109, 180, 0.1)",
              border: "1px solid rgba(255, 109, 180, 0.3)",
              borderRadius: "var(--radius-md)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-sm)",
              color: "var(--accent-pink)",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
          <label
            htmlFor="auth-email"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-xs)",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="search-input"
            style={{ paddingLeft: "var(--space-md)" }}
            placeholder="you@example.com"
          />
        </div>

        {mode === "register" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
            <label
              htmlFor="auth-username"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-xs)",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Username
            </label>
            <input
              id="auth-username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="search-input"
              style={{ paddingLeft: "var(--space-md)" }}
              placeholder="cooldev42"
            />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
          <label
            htmlFor="auth-password"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-xs)",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="search-input"
            style={{ paddingLeft: "var(--space-md)" }}
            placeholder="Min 6 characters"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary"
          style={{ width: "100%", opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? "Please wait\u2026" : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        <p
          style={{
            textAlign: "center",
            fontFamily: "var(--font-body)",
            fontSize: "var(--font-base)",
            color: "var(--text-muted)",
          }}
        >
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            style={{
              background: "none",
              border: "none",
              color: "var(--accent-electric)",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              fontSize: "var(--font-base)",
              fontWeight: 600,
              textDecoration: "underline",
              textUnderlineOffset: "2px",
            }}
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>

        <p
          style={{
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-xs)",
            color: "var(--text-muted)",
          }}
        >
          Demo: dev@mcpx.dev / demo1234
        </p>
      </form>
    </div>
  );
}
