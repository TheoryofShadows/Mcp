import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
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

export default function App() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "var(--text-primary)" }}>
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
