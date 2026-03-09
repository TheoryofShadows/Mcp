import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

/**
 * Handles the OAuth callback from Supabase/GitHub.
 *
 * Safari's ITP bounce-tracking protection can clear localStorage during
 * cross-origin redirect chains (app → github.com → supabase.co → app),
 * causing the PKCE code verifier to be lost if we redirect straight to
 * /dashboard.  By landing here first and calling exchangeCodeForSession()
 * explicitly, we avoid that race and give Supabase a clean chance to
 * persist the session before we navigate away.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const errorParam = params.get("error");
      const errorDescription = params.get("error_description");

      if (errorParam) {
        console.error("OAuth error:", errorParam, errorDescription);
        navigate(`/login?error=${encodeURIComponent(errorDescription || errorParam)}`, {
          replace: true,
        });
        return;
      }

      if (code && supabase) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("Session exchange failed:", error.message);
          navigate(`/login?error=${encodeURIComponent(error.message)}`, {
            replace: true,
          });
          return;
        }
      }

      navigate("/dashboard", { replace: true });
    }

    handleCallback();
  }, [navigate]);

  return (
    <main
      id="main-content"
      style={{
        minHeight: "calc(100vh - 60px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
        fontSize: "12px",
        letterSpacing: "0.06em",
      }}
    >
      Completing sign-in…
    </main>
  );
}
