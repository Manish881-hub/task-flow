import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiPost, apiGet, setAuthToken, clearAuthToken, getAuthToken } from "./api";

const AuthContext = createContext(null);

function extractToken(data) {
  if (!data || typeof data !== "object") return null;
  return data.access_token || data.accessToken || data.token || null;
}

function extractUser(data) {
  if (!data || typeof data !== "object") return null;
  return data.user || data.profile || null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null); // in-memory mirror for reactivity
  const [authReady, setAuthReady] = useState(false);

  const applySession = useCallback((data) => {
    const t = extractToken(data);
    const u = extractUser(data);
    if (t) {
      setAuthToken(t);
      setToken(t);
    }
    if (u) setUser(u);
    return { token: t, user: u };
  }, []);

  const refresh = useCallback(async () => {
    try {
      // Refresh endpoint reads httpOnly cookie; do not retry-loop on 401.
      const { api } = await import("./api");
      const data = await api("/api/v1/auth/refresh", { method: "POST", retry: false });
      const t = extractToken(data);
      const u = extractUser(data);
      if (t) {
        setAuthToken(t);
        setToken(t);
      }
      if (u) {
        setUser(u);
        return u;
      }
      // Token rotated but no user payload — fetch /me.
      if (t) {
        try {
          const me = await apiGet("/api/v1/auth/me", { retry: false });
          const meUser = me && (me.user || me);
          setUser(meUser);
          return meUser;
        } catch {
          return null;
        }
      }
      return null;
    } catch {
      clearAuthToken();
      setToken(null);
      setUser(null);
      return null;
    }
  }, []);

  // Silent refresh on app start.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
      if (!cancelled) setAuthReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const login = useCallback(
    async ({ email, password }) => {
      const data = await apiPost("/api/v1/auth/login", { email, password });
      const t = extractToken(data);
      let u = extractUser(data);
      if (t) {
        setAuthToken(t);
        setToken(t);
      }
      if (!u && t) {
        try {
          const me = await apiGet("/api/v1/auth/me");
          u = me && (me.user || me);
        } catch {
          u = null;
        }
      }
      if (u) setUser(u);
      return { token: t, user: u, raw: data };
    },
    []
  );

  const signup = useCallback(
    async ({ name, email, password }) => {
      const data = await apiPost("/api/v1/auth/signup", { name, email, password });
      const t = extractToken(data);
      let u = extractUser(data);
      if (t) {
        setAuthToken(t);
        setToken(t);
      }
      if (!u && t) {
        try {
          const me = await apiGet("/api/v1/auth/me");
          u = me && (me.user || me);
        } catch {
          u = null;
        }
      }
      if (u) setUser(u);
      return { token: t, user: u, raw: data };
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await apiPost("/api/v1/auth/logout", {});
    } catch {
      // Best-effort; clear client state regardless.
    }
    clearAuthToken();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      accessToken: token || getAuthToken(),
      authReady,
      login,
      signup,
      logout,
      refresh,
      isAuthed: Boolean(user),
    }),
    [user, token, authReady, login, signup, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
