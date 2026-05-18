import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "prediqs_auth_token";

export function getApiBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "";
}

export function chatUrl(): string {
  return `${getApiBaseUrl()}/api/chat`;
}

export const tokenStorage = {
  async get(): Promise<string | null> {
    if (Platform.OS === "web") {
      return typeof localStorage !== "undefined"
        ? localStorage.getItem(TOKEN_KEY)
        : null;
    }
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  async set(token: string): Promise<void> {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined")
        localStorage.setItem(TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  async remove(): Promise<void> {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined")
        localStorage.removeItem(TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...rest } = options;
  const url = `${getApiBaseUrl()}/api${path}`;
  const response = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(rest.headers ?? {}),
    },
  });
  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try {
      const err = (await response.json()) as { error?: string };
      msg = err.error ?? msg;
    } catch {}
    throw new Error(msg);
  }
  return response.json() as Promise<T>;
}

export interface UserData {
  id: number;
  username: string;
  email: string;
  tier: "free" | "pro" | "elite";
  bankroll: number;
  dailyLossLimit: number;
}

export interface ApiPrediction {
  id: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  prediction: string;
  confidence: number;
  riskLevel: string;
  volatilityScore: number;
  isTrapGame: boolean;
  avoidMatch: boolean;
  avoidReason: string | null;
  reasoning: string;
  keyFactors: string[];
  weatherImpact: string | null;
  sharpMoneySignal: string | null;
  aiProbability: number;
  bookmakerProbability: number;
  valueDetected: boolean;
  tierRequired: string;
}

export interface ApiBankrollEntry {
  id: number;
  userId: number;
  type: string;
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface BankrollData {
  bankroll: number;
  dailyLossLimit: number;
  entries: ApiBankrollEntry[];
}

export interface SetupVar {
  key: string;
  label: string;
  configured: boolean;
  critical: boolean;
  description: string;
  affectsFeatures: string;
  howToGet: string;
  signupUrl: string | null;
  hasFree: boolean;
  steps: string[];
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiFetch<{ token: string; user: UserData }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (username: string, email: string, password: string) =>
      apiFetch<{ token: string; user: UserData }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      }),
  },
  user: {
    me: (token: string) => apiFetch<UserData>("/user/me", { token }),
    update: (
      token: string,
      data: Partial<
        Pick<UserData, "username" | "dailyLossLimit" | "bankroll">
      >,
    ) =>
      apiFetch<UserData>("/user/me", {
        method: "PUT",
        body: JSON.stringify(data),
        token,
      }),
  },
  predictions: {
    list: (token: string) => apiFetch<ApiPrediction[]>("/predictions", { token }),
    refresh: (token: string) =>
      apiFetch<{ count: number }>("/predictions/refresh", {
        method: "POST",
        token,
      }),
  },
  bankroll: {
    get: (token: string) => apiFetch<BankrollData>("/bankroll", { token }),
    addEntry: (
      token: string,
      entry: { type: string; amount: number; description?: string },
    ) =>
      apiFetch<{ entry: ApiBankrollEntry; newBankroll: number }>(
        "/bankroll/entry",
        { method: "POST", body: JSON.stringify(entry), token },
      ),
  },
  setup: {
    status: (token: string) =>
      apiFetch<{
        allCriticalOk: boolean;
        configuredCount: number;
        totalCount: number;
        critical: SetupVar[];
        optional: SetupVar[];
      }>("/setup/status", { token }),
  },
  subscription: {
    status: (token: string) =>
      apiFetch<{ tier: string; subscriptionId: string | null }>(
        "/subscription/status",
        { token },
      ),
    checkout: (token: string, tier: "pro" | "elite") =>
      apiFetch<{ url: string }>("/subscription/checkout", {
        method: "POST",
        body: JSON.stringify({ tier }),
        token,
      }),
  },
};
