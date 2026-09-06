import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/sections/Footer";
import ErrorBoundary from "./components/ErrorBoundary";

const Home         = lazy(() => import("./pages/Home"));
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
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
        fontSize: "12px",
        letterSpacing: "0.06em",
      }}
    >
      Loading…
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
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/tool/:slug"  element={<ToolDetail />} />
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
