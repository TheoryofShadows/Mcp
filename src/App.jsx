import { useState } from "react";
import {
  Navbar,
  HeroSection,
  Marketplace,
  PublishSection,
  RevenueSection,
  DocsSection,
  Footer,
} from "./components/sections";

export default function App() {
  const [activeView, setActiveView] = useState("marketplace");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
      }}
    >
      <Navbar activeView={activeView} setActiveView={setActiveView} />
      <HeroSection />
      {activeView === "marketplace" && <Marketplace />}
      {activeView === "publish" && <PublishSection />}
      {activeView === "revenue" && <RevenueSection />}
      {activeView === "docs" && <DocsSection />}
      <Footer />
    </div>
  );
}
