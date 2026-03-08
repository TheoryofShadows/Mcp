import { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./authContextValue";
import { supabase, isSupabaseEnabled } from "../lib/supabase";
import { login as apiLogin, register as apiRegister, getMe } from "../api/client";

export { AuthContext };

const TOKEN_KEY = "mcpx_token";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSupabaseEnabled) {
      // ── Supabase auth mode ──────────────────────────────────────────────────
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    } else {
      // ── Fallback: custom JWT auth via Express API ───────────────────────────
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) { setLoading(false); return; }
      let cancelled = false;
      getMe()
        .then((u) => { if (!cancelled) setUser(u); })
        .catch(() => { localStorage.removeItem(TOKEN_KEY); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }
  }, []);

  // ── Login (fallback JWT mode) ───────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    if (isSupabaseEnabled) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setUser(data.user);
      return data.user;
    }
    const { token, user: u } = await apiLogin(email, password);
    localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
    return u;
  }, []);

  // ── Register (fallback JWT mode) ────────────────────────────────────────────
  const register = useCallback(async (email, username, password) => {
    if (isSupabaseEnabled) {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { user_name: username } } });
      if (error) throw error;
      setUser(data.user);
      return data.user;
    }
    const { token, user: u } = await apiRegister(email, username, password);
    localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
    return u;
  }, []);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    if (isSupabaseEnabled) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
