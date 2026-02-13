import { useState, lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { Navbar, HeroSection, Footer } from "./components/sections";
import AuthModal from "./components/AuthModal";

const Marketplace = lazy(() => import("./components/sections/Marketplace"));
const PublishSection = lazy(() => import("./components/sections/PublishSection"));
const RevenueSection = lazy(() => import("./components/sections/RevenueSection"));
const DocsSection = lazy(() => import("./components/sections/DocsSection"));
const ServerDetail = lazy(() => import("./pages/ServerDetail"));

function SectionFallback() {
  return (
    <div
      style={{
        padding: "var(--space-3xl) var(--section-px)",
        textAlign: "center",
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--font-sm)",
      }}
    >
      Loading...
    </div>
  );
}

export default function App() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
      }}
    >
      <a href="#main-content" className="skip-to-content">
        Skip to content
      </a>
      <Navbar onAuthClick={() => setShowAuth(true)} />
      <ErrorBoundary>
        <Suspense fallback={<SectionFallback />}>
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
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <Footer />
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
