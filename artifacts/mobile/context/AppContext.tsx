import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { useAuth } from "@/context/AuthContext";
import { api, setApiExperience, type ApiBankrollEntry } from "@/lib/api";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";
import type { BankrollEntry, EntryType, Tier, UserProfile } from "@/types";

export const BETTING_EXPERIENCE_KEY = "@betting_experience";

export type BettingExperience =
  | "Beginner"
  | "Intermediate"
  | "Advanced"
  | "Professional";

const VALID_EXPERIENCES: readonly BettingExperience[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Professional",
];

const DEFAULT_EXPERIENCE: BettingExperience = "Beginner";

/** Coerce an arbitrary stored string to a valid level, falling back to default. */
function coerceExperience(value: string | null): BettingExperience {
  return VALID_EXPERIENCES.includes(value as BettingExperience)
    ? (value as BettingExperience)
    : DEFAULT_EXPERIENCE;
}

interface AppContextValue {
  profile: UserProfile;
  bankrollEntries: BankrollEntry[];
  addEntry: (entry: { type: EntryType; amount: number; description?: string }) => Promise<void>;
  updateBankroll: (amount: number) => Promise<void>;
  setTier: (tier: Tier) => Promise<void>;
  refreshBankroll: () => Promise<void>;
  bettingExperience: BettingExperience;
  setBettingExperience: (level: BettingExperience) => Promise<void>;
  appGuideSeen: boolean | null;
  markAppGuideSeen: () => Promise<void>;
  onboardingSeen: boolean | null;
  markOnboardingSeen: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
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
  const [bettingExperience, setBettingExperienceState] =
    useState<BettingExperience>(DEFAULT_EXPERIENCE);
  // null = still hydrating from storage; gate logic waits for a concrete value.
  const [appGuideSeen, setAppGuideSeen] = useState<boolean | null>(null);
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  // Hydrate the first-run gating flags from storage on mount.
  useEffect(() => {
    (async () => {
      const [guideSeen, onbSeen] = await Promise.all([
        getItem<boolean>(STORAGE_KEYS.appGuideComplete, false),
        getItem<boolean>(STORAGE_KEYS.onboardingComplete, false),
      ]);
      setAppGuideSeen(guideSeen);
      setOnboardingSeen(onbSeen);
    })();
  }, []);

  const markAppGuideSeen = useCallback(async () => {
    setAppGuideSeen(true);
    await setItem(STORAGE_KEYS.appGuideComplete, true);
  }, []);

  // Mark onboarding finished (called when the user completes the last step).
  const markOnboardingSeen = useCallback(async () => {
    setOnboardingSeen(true);
    await setItem(STORAGE_KEYS.onboardingComplete, true);
  }, []);

  // Force a fresh user back through onboarding (called on every new signup so the
  // device-level flag from a previous account never lets a new user skip it).
  const resetOnboarding = useCallback(async () => {
    setOnboardingSeen(false);
    await setItem(STORAGE_KEYS.onboardingComplete, false);
  }, []);

  // Hydrate betting experience from storage on mount (independent of auth) and
  // keep the API layer's outbound header in sync.
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(BETTING_EXPERIENCE_KEY);
        const level = coerceExperience(stored);
        setBettingExperienceState(level);
        setApiExperience(level);
      } catch {
        setApiExperience(DEFAULT_EXPERIENCE);
      }
    })();
  }, []);

  const setBettingExperience = useCallback(async (level: BettingExperience) => {
    setBettingExperienceState(level);
    setApiExperience(level);
    try {
      await AsyncStorage.setItem(BETTING_EXPERIENCE_KEY, level);
    } catch {}
  }, []);

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
        bettingExperience,
        setBettingExperience,
        appGuideSeen,
        markAppGuideSeen,
        onboardingSeen,
        markOnboardingSeen,
        resetOnboarding,
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
