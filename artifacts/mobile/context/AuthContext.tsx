import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { api, tokenStorage, type UserData } from "@/lib/api";
import { signInWithGoogle, signOutGoogle } from "@/lib/google";

interface AuthContextValue {
  user: UserData | null;
  token: string | null;
  isLoading: boolean;
  pendingOnboarding: boolean;
  setPendingOnboarding: (v: boolean) => void;
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resendVerification: () => Promise<void>;
  checkEmailVerified: () => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingOnboarding, setPendingOnboarding] = useState(false);

  useEffect(() => {
    async function restoreSession() {
      try {
        const saved = await tokenStorage.get();
        if (saved) {
          const userData = await api.user.me(saved);
          setToken(saved);
          setUser(userData);
        }
      } catch {
        await tokenStorage.remove();
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const { token: t, user: u } = await api.auth.login(identifier, password);
    await tokenStorage.set(t);
    setToken(t);
    setUser(u);
  }, []);

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const { token: t, user: u } = await api.auth.register(
        username,
        email,
        password,
      );
      await tokenStorage.set(t);
      setToken(t);
      setPendingOnboarding(true);
      setUser(u);
    },
    [],
  );

  const loginWithGoogle = useCallback(async () => {
    const idToken = await signInWithGoogle();
    const { token: t, user: u } = await api.auth.google(idToken);
    await tokenStorage.set(t);
    setToken(t);
    setUser(u);
  }, []);

  const resendVerification = useCallback(async () => {
    if (!token) throw new Error("Not signed in");
    await api.auth.resendVerification(token);
  }, [token]);

  const checkEmailVerified = useCallback(async (): Promise<boolean> => {
    if (!token) return false;
    const u = await api.user.me(token);
    setUser(u);
    return u.emailVerified === true;
  }, [token]);

  const logout = useCallback(async () => {
    await signOutGoogle();
    await tokenStorage.remove();
    setToken(null);
    setUser(null);
    setPendingOnboarding(false);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const u = await api.user.me(token);
      setUser(u);
    } catch {}
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        pendingOnboarding,
        setPendingOnboarding,
        login,
        register,
        loginWithGoogle,
        resendVerification,
        checkEmailVerified,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
