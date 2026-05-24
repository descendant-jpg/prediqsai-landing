import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { useAuth } from "@/context/AuthContext";
import { api, type ApiBankrollEntry } from "@/lib/api";
import type { BankrollEntry, EntryType, Tier, UserProfile } from "@/types";

interface AppContextValue {
  profile: UserProfile;
  bankrollEntries: BankrollEntry[];
  addEntry: (entry: { type: EntryType; amount: number; description?: string }) => Promise<void>;
  updateBankroll: (amount: number) => Promise<void>;
  setTier: (tier: Tier) => Promise<void>;
  refreshBankroll: () => Promise<void>;
  isLoaded: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

function mapEntry(e: ApiBankrollEntry): BankrollEntry {
  return {
    id: String(e.id),
    type: e.type as EntryType,
    amount: e.amount,
    description: e.description,
    createdAt: e.createdAt,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user, token, refreshUser } = useAuth();
  const [bankrollEntries, setBankrollEntries] = useState<BankrollEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Normalize legacy tiers: pro/elite → premium
  const rawTier = user?.tier ?? "free";
  const normalizedTier: Tier = rawTier === "premium" ? "premium" : "free";

  const profile: UserProfile = {
    tier: normalizedTier,
    bankroll: user?.bankroll ?? 0,
    dailyLossLimit: user?.dailyLossLimit ?? 200,
    username: user?.username ?? "Bettor",
  };

  const refreshBankroll = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.bankroll.get(token);
      setBankrollEntries(data.entries.map(mapEntry));
    } catch {}
  }, [token]);

  useEffect(() => {
    if (!token) {
      setBankrollEntries([]);
      setIsLoaded(false);
      return;
    }
    async function load() {
      await refreshBankroll();
      setIsLoaded(true);
    }
    load();
  }, [token, refreshBankroll]);

  const addEntry = useCallback(
    async (entry: { type: EntryType; amount: number; description?: string }) => {
      if (!token) return;
      await api.bankroll.addEntry(token, entry);
      await Promise.all([refreshBankroll(), refreshUser()]);
    },
    [token, refreshBankroll, refreshUser],
  );

  const updateBankroll = useCallback(
    async (amount: number) => {
      if (!token) return;
      await api.user.update(token, { bankroll: amount });
      await refreshUser();
    },
    [token, refreshUser],
  );

  const setTier = useCallback(
    async (_tier: Tier) => {
      await refreshUser();
    },
    [refreshUser],
  );

  return (
    <AppContext.Provider
      value={{
        profile,
        bankrollEntries,
        addEntry,
        updateBankroll,
        setTier,
        refreshBankroll,
        isLoaded,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
