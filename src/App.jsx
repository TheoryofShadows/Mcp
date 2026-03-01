import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ErrorBoundary from "./components/ErrorBoundary";

const Marketplace = lazy(() => import("./components/sections/Marketplace"));
const PublishSection = lazy(() => import("./components/sections/PublishSection"));
const RevenueSection = lazy(() => import("./components/sections/RevenueSection"));
const DocsSection = lazy(() => import("./components/sections/DocsSection"));
const ServerDetail = lazy(() => import("./pages/ServerDetail"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const Home        = lazy(() => import("./pages/Home"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const ToolDetail  = lazy(() => import("./pages/ToolDetail"));
const Submit      = lazy(() => import("./pages/Submit"));
const Dashboard   = lazy(() => import("./pages/Dashboard"));
const Login       = lazy(() => import("./pages/Login"));

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
            <Route
              path="/"
              element={
                <>
                  <HeroSection />
                  <Marketplace />
                </>
              }
            />
            <Route path="/publish" element={<PublishSection onAuthClick={() => setShowAuth(true)} />} />
            <Route path="/revenue" element={<RevenueSection onAuthClick={() => setShowAuth(true)} />} />
            <Route path="/docs" element={<DocsSection />} />
            <Route path="/servers/:slug" element={<ServerDetail />} />
            <Route path="/dashboard" element={<DashboardPage onAuthClick={() => setShowAuth(true)} />} />
            <Route path="/"            element={<Home />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/tool/:slug"  element={<ToolDetail />} />
            <Route path="/submit"      element={<Submit />} />
            <Route path="/dashboard"   element={<Dashboard />} />
            <Route path="/login"       element={<Login />} />
            {/* Legacy route compat */}
            <Route path="/servers/:slug" element={<ToolDetail />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>

      <footer
        style={{
          borderTop: "1px solid #1a1a1a",
          padding: "32px 24px",
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <span>© 2025 MCPX · The App Store for AI Agents · 15% platform fee</span>
          <div style={{ display: "flex", gap: "20px" }}>
            {[
              { label: "Marketplace", href: "/marketplace" },
              { label: "Submit Tool", href: "/submit" },
              { label: "Dashboard",   href: "/dashboard" },
              { label: "GitHub",      href: "https://github.com", target: "_blank" },
            ].map(({ label, href, target }) => (
              <a
                key={label}
                href={href}
                target={target}
                rel={target ? "noopener noreferrer" : undefined}
                style={{ color: "var(--text-muted)", textDecoration: "none", transition: "color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#818cf8")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
