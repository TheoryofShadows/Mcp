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
 */
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseEnabled = !!supabase;
