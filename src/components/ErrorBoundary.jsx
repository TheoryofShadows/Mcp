import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            // Self-contained dark styling with hard-coded fallbacks: this can be
            // the outermost boundary, rendering before the app's theme mounts
            // (or if globals.css fails), so it must stay legible on a bare page.
            padding: "48px 24px",
            minHeight: "100vh",
            boxSizing: "border-box",
            background: "var(--bg-primary)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
          }}
        >
          <div style={{ fontSize: "36px", opacity: 0.4 }}>{"\u26A0"}</div>
          <p
            style={{
              fontFamily: "var(--font-heading, ui-serif, Georgia, serif)",
              fontSize: "18px",
              fontWeight: 400,
              color: "var(--text-primary)",
            }}
          >
            Something went wrong
          </p>
          <p
            style={{
              fontFamily: "var(--font-mono, ui-monospace, monospace)",
              fontSize: "12px",
              color: "var(--text-secondary)",
              maxWidth: "32rem",
              wordBreak: "break-word",
            }}
          >
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              className="btn btn-outline-green"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </button>
            <button
              className="btn btn-outline-green"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
