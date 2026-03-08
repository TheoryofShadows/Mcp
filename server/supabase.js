import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isConfigured =
  supabaseUrl &&
  supabaseServiceKey &&
  supabaseUrl !== "https://your-project.supabase.co" &&
  supabaseServiceKey !== "your-service-role-key-here";

/**
 * Server-side Supabase client using the service role key.
 * This bypasses Row Level Security and is suitable for server operations only.
 * Never expose this client or its key to the browser.
 *
 * Returns null when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set,
 * allowing the server to fall back to the local SQLite database.
 */
export const supabaseAdmin = isConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export const isSupabaseEnabled = !!supabaseAdmin;
