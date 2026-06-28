import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useSession } from "@descope/react-sdk";

// The Admin link is the only thing that depends on Descope. `useSession` is
// unsafe to call outside a <DescopeAuthProvider>, so this component is rendered
// by Navbar ONLY when Descope is configured (VITE_DESCOPE_PROJECT_ID is set).
// Keeping the hook isolated here means an unconfigured deploy never touches
// Descope at all — which is what kept iOS Safari from white-screening.
export default function AdminNavLink({ active, variant = "desktop", onClick }) {
  const { isAuthenticated } = useSession();
  if (!isAuthenticated) return null;

  const desktop = {
    textDecoration: "none",
    padding: "6px 14px",
    borderRadius: "8px",
    fontFamily: "var(--font-body)",
    fontSize: "13px",
    fontWeight: 500,
    color: active ? "#b9adff" : "var(--text-secondary)",
    background: active ? "rgba(124, 108, 255,0.1)" : "transparent",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.15s ease",
  };

  const mobile = {
    textDecoration: "none",
    padding: "12px 16px",
    borderRadius: "10px",
    fontFamily: "var(--font-body)",
    fontSize: "15px",
    fontWeight: 500,
    color: active ? "#b9adff" : "var(--text-secondary)",
    background: active ? "rgba(124, 108, 255,0.1)" : "transparent",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  };

  const isMobile = variant === "mobile";

  return (
    <Link to="/admin" onClick={onClick} style={isMobile ? mobile : desktop}>
      <ShieldCheck size={isMobile ? 16 : 13} />
      Admin
    </Link>
  );
}
