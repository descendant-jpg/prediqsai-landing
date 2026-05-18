import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type { BankrollEntry, Tier, UserProfile } from "@/types";

const STORAGE_KEYS = {
  PROFILE: "@prediqs:profile",
  ENTRIES: "@prediqs:bankroll_entries",
};

interface AppContextValue {
  profile: UserProfile;
  bankrollEntries: BankrollEntry[];
  addEntry: (entry: Omit<BankrollEntry, "id" | "createdAt">) => Promise<void>;
  updateBankroll: (amount: number) => Promise<void>;
  setTier: (tier: Tier) => Promise<void>;
  isLoaded: boolean;
}

const defaultProfile: UserProfile = {
  tier: "free",
  bankroll: 1000,
  dailyLossLimit: 200,
  username: "Bettor",
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [bankrollEntries, setBankrollEntries] = useState<BankrollEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [profileRaw, entriesRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.PROFILE),
          AsyncStorage.getItem(STORAGE_KEYS.ENTRIES),
        ]);
        if (profileRaw) setProfile(JSON.parse(profileRaw));
        if (entriesRaw) setBankrollEntries(JSON.parse(entriesRaw));
      } catch {}
      setIsLoaded(true);
    }
    load();
  }, []);

  const saveProfile = useCallback(async (p: UserProfile) => {
    setProfile(p);
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(p));
  }, []);

  const addEntry = useCallback(
    async (entry: Omit<BankrollEntry, "id" | "createdAt">) => {
      const newEntry: BankrollEntry = {
        ...entry,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
      };
      const updated = [newEntry, ...bankrollEntries];
      setBankrollEntries(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(updated));

      // Update bankroll balance
      const delta =
        entry.type === "deposit" || entry.type === "win"
          ? entry.amount
          : -entry.amount;
      await saveProfile({ ...profile, bankroll: profile.bankroll + delta });
    },
    [bankrollEntries, profile, saveProfile],
  );

  const updateBankroll = useCallback(
    async (amount: number) => {
      await saveProfile({ ...profile, bankroll: amount });
    },
    [profile, saveProfile],
  );

  const setTier = useCallback(
    async (tier: Tier) => {
      await saveProfile({ ...profile, tier });
    },
    [profile, saveProfile],
  );

  return (
    <AppContext.Provider
      value={{ profile, bankrollEntries, addEntry, updateBankroll, setTier, isLoaded }}
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
