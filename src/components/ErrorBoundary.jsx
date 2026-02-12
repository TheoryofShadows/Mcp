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
            padding: "var(--space-2xl, 48px) var(--space-lg, 24px)",
            textAlign: "center",
            minHeight: "200px",
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
              fontFamily: "var(--font-heading, 'Syne', sans-serif)",
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--text-primary, #F0F0F5)",
            }}
          >
            Something went wrong
          </p>
          <p
            style={{
              fontFamily: "var(--font-mono, 'Space Mono', monospace)",
              fontSize: "12px",
              color: "var(--text-muted, #707088)",
            }}
          >
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            className="btn btn-outline-green"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
