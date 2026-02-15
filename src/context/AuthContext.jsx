import { useState, useEffect, useCallback } from "react";
import { login as apiLogin, register as apiRegister, getMe, storeTokens, clearTokens } from "../api/client";
import { AuthContext } from "./authContextValue";

export { AuthContext };

const TOKEN_KEY = "mcpx_token";

function hasToken() {
  try {
    return !!localStorage.getItem(TOKEN_KEY);
  } catch {
    return false;
  }
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(hasToken);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    let cancelled = false;
    getMe()
      .then((u) => { if (!cancelled) setUser(u); })
      .catch(() => { clearTokens(); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, refresh_token, user: u } = await apiLogin(email, password);
    storeTokens(token, refresh_token);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (email, username, password) => {
    const { token, refresh_token, user: u } = await apiRegister(email, username, password);
    storeTokens(token, refresh_token);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
