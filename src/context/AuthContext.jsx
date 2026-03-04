import { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./authContextValue";
import { login as apiLogin, register as apiRegister, getMe } from "../api/client";

export { AuthContext };

const TOKEN_KEY = "mcpx_token";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setUser(null); setLoading(false); return; }
    getMe()
      .then((u) => setUser(u))
      .catch(() => { localStorage.removeItem(TOKEN_KEY); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email, password) => {
    const { token, user: u } = await apiLogin(email, password);
    localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (email, username, password) => {
    const { token, user: u } = await apiRegister(email, username, password);
    localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
