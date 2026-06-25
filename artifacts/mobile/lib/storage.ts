import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "prediqs_";

export const STORAGE_KEYS = {
  badges: "badges_v1",
  bankrollEntries: "bankroll_entries_v1",
  journalEntries: "journal_entries_v1",
  notificationsRead: "notifications_read_v1",
  notificationsSeeded: "notifications_seeded_v1",
  sportFilter: "sport_filter_v1",
  picksFilter: "picks_filter",
  betSlip: "betslip",
  savedPicks: "saved_picks",
  appGuideComplete: "app_guide_complete_v1",
  onboardingComplete: "onboarding_complete_v1",
} as const;

export async function getItem<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // best-effort; ignore write failures
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch {
    // best-effort; ignore
  }
}
