import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setAuthToken, clearAuthToken } from "@/lib/api";

const AuthContext = createContext(null);

const TOKEN_KEY = "lumiere_token";

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((userData, token) => {
    if (userData && token) {
      localStorage.setItem(TOKEN_KEY, token);
      setAuthToken(token);
    }
    setUserState(userData);
  }, []);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    setAuthToken(token);
    try {
      const { data } = await api.get("/auth/me");
      setUserState(data);
      return data;
    } catch (e) {
      localStorage.removeItem(TOKEN_KEY);
      clearAuthToken();
      setUserState(null);
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchMe();
      setLoading(false);
    })();
  }, [fetchMe]);

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      // ignore
    }
    localStorage.removeItem(TOKEN_KEY);
    clearAuthToken();
    setUserState(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, fetchMe, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
