import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/sections/Footer";
import ErrorBoundary from "./components/ErrorBoundary";
// Eager-load the landing page so first paint is not a blank "Loading…" shell.
import Home from "./pages/Home";

const Marketplace  = lazy(() => import("./pages/Marketplace"));
const ToolDetail   = lazy(() => import("./pages/ToolDetail"));
const Submit       = lazy(() => import("./pages/Submit"));
const Dashboard    = lazy(() => import("./pages/Dashboard"));
const Login        = lazy(() => import("./pages/Login"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Admin        = lazy(() => import("./pages/Admin"));
const Pricing      = lazy(() => import("./pages/Pricing"));

const DOCS_README_URL =
  "https://github.com/TheoryofShadows/Mcp/blob/main/docs/README.md";

function PageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: "40vh",
        maxWidth: "720px",
        margin: "48px auto",
        padding: "0 24px",
      }}
    >
      <div style={{ height: 14, width: "40%", background: "#1d1d2b", borderRadius: 8, marginBottom: 16 }} />
      <div style={{ height: 48, width: "100%", background: "#12121c", border: "1px solid #1d1d2b", borderRadius: 12, marginBottom: 12 }} />
      <div style={{ height: 48, width: "92%", background: "#12121c", border: "1px solid #1d1d2b", borderRadius: 12, marginBottom: 12 }} />
      <div style={{ height: 48, width: "86%", background: "#12121c", border: "1px solid #1d1d2b", borderRadius: 12 }} />
      <p style={{ marginTop: 18, color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.06em" }}>
        Loading…
      </p>
    </div>
  );
}

function DocsRedirect() {
  useEffect(() => {
    window.location.replace(DOCS_README_URL);
  }, []);
  return (
    <div
      style={{
        minHeight: "40vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
        fontSize: "13px",
      }}
    >
      Redirecting to docs…
    </div>
  );
}

export default function App() {
  return (
    <div style={{ minHeight: "100vh", background: "transparent", color: "var(--text-primary)" }}>
      <a
        href="#main-content"
        className="skip-to-content"
      >
        Skip to content
      </a>

      <Navbar />

      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"            element={<Home />} />
            <Route path="/start"       element={<Navigate to={{ pathname: "/", hash: "new-here" }} replace />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/tool/:slug"  element={<ToolDetail />} />
            <Route path="/tools/:slug" element={<ToolDetail />} />
            <Route path="/submit"      element={<Submit />} />
            <Route path="/dashboard"      element={<Dashboard />} />
            <Route path="/login"          element={<Login />} />
            <Route path="/signup"         element={<Navigate to="/login?mode=signup" replace />} />
            <Route path="/docs"           element={<DocsRedirect />} />
            <Route path="/auth/callback"  element={<AuthCallback />} />
            <Route path="/admin"          element={<Admin />} />
            <Route path="/pricing"        element={<Pricing />} />
            {/* Legacy route compat */}
            <Route path="/servers/:slug" element={<ToolDetail />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>

      <Footer />
    </div>
  );
}
