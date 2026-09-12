"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiFetch } from "./api";

// Shape of the user object returned by the Express API.
// Verified against artifacts/api-server/src/routes/auth.ts + user.ts.
export interface AuthUser {
  id: number;
  email: string;
  username?: string;
  displayName?: string | null;
  isAdmin?: boolean;
  tier?: string | null;
  subscriptionTier?: string | null;
  bankroll?: number;
  dailyLossLimit?: number;
  emailVerified?: boolean;
  [key: string]: unknown;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: {
    email: string;
    password: string;
    displayName?: string;
  }) => Promise<{ needsVerification: boolean }>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const TOKEN_KEY = "prediqs_token";

function normalizeUser(user: AuthUser): AuthUser {
  return {
    ...user,
    displayName: user.displayName ?? user.username ?? null,
    subscriptionTier: user.subscriptionTier ?? user.tier ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async (t: string) => {
    const me = normalizeUser(await apiFetch<AuthUser>("/user/me", { token: t }));
    setUser(me);
    return me;
  }, []);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      setLoading(false);
      return;
    }
    setToken(t);
    fetchMe(t)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [fetchMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch<{ token: string; user: AuthUser }>(
        "/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) },
      );
      localStorage.setItem(TOKEN_KEY, res.token);
      setToken(res.token);
      const user = normalizeUser(res.user);
      setUser(user);
      return user;
    },
    [],
  );

  const register = useCallback(
    async (input: { email: string; password: string; displayName?: string }) => {
      const res = await apiFetch<{
        token?: string;
        user?: AuthUser;
        needsVerification?: boolean;
        message?: string;
      }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: input.displayName?.trim() || input.email.split("@")[0],
          email: input.email,
          password: input.password,
        }),
      });
      if (res.token && res.user) {
        localStorage.setItem(TOKEN_KEY, res.token);
        setToken(res.token);
        setUser(normalizeUser(res.user));
        return { needsVerification: false };
      }
      return { needsVerification: res.needsVerification ?? true };
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (token) await fetchMe(token).catch(() => {});
  }, [token, fetchMe]);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
