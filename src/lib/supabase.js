import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured =
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== "https://your-project.supabase.co" &&
  supabaseAnonKey !== "your-anon-key-here";

/**
 * Supabase client — null when env vars are not configured.
 * All data hooks fall back to seed data when this is null.
 *
 * Auth options are explicit to ensure correct behaviour on Safari:
 * - flowType 'pkce' is the default but we pin it so the PKCE code-verifier
 *   storage key is deterministic and the callback page can rely on it.
 * - detectSessionInUrl must be true so the client exchanges the ?code=
 *   returned by the /auth/callback page's exchangeCodeForSession call.
 * - storage is pinned to localStorage; the dedicated /auth/callback route
 *   calls exchangeCodeForSession() explicitly before any navigation, which
 *   avoids the race where Safari's ITP bounce-tracking protection can clear
 *   localStorage mid-redirect when going straight to /dashboard.
 */
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
    })
  : null;

export const isSupabaseEnabled = !!supabase;
