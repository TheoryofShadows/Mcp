import { useState, lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { Navbar, HeroSection, Footer } from "./components/sections";

const Marketplace = lazy(() => import("./components/sections/Marketplace"));
const PublishSection = lazy(() => import("./components/sections/PublishSection"));
const RevenueSection = lazy(() => import("./components/sections/RevenueSection"));
const DocsSection = lazy(() => import("./components/sections/DocsSection"));

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

const VIEW_COMPONENTS = {
  marketplace: Marketplace,
  publish: PublishSection,
  revenue: RevenueSection,
  docs: DocsSection,
};

export default function App() {
  const [activeView, setActiveView] = useState("marketplace");
  const ActiveSection = VIEW_COMPONENTS[activeView];

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
      <Navbar activeView={activeView} setActiveView={setActiveView} />
      <HeroSection />
      <ErrorBoundary>
        <Suspense fallback={<SectionFallback />}>
          {ActiveSection && <ActiveSection />}
        </Suspense>
      </ErrorBoundary>
      <Footer />
    </div>
  );
}
