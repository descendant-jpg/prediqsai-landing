import * as Localization from "expo-localization";
import { useEffect, useState } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

export type AffiliateRegion =
  | "UK_IRELAND"
  | "EUROPE"
  | "EUROPE_DE"
  | "EUROPE_ES"
  | "EUROPE_FR"
  | "EUROPE_IT"
  | "AFRICA"
  | "USA"
  | "ASIA"
  | "GLOBAL";

export const REGION_LABELS: Record<AffiliateRegion, string> = {
  UK_IRELAND: "🇬🇧 UK & Ireland",
  EUROPE: "🌍 Europe",
  EUROPE_DE: "🇩🇪 Germany",
  EUROPE_ES: "🇪🇸 Spain",
  EUROPE_FR: "🇫🇷 France",
  EUROPE_IT: "🇮🇹 Italy",
  AFRICA: "🌍 Africa",
  USA: "🇺🇸 USA",
  ASIA: "🌏 Asia",
  GLOBAL: "🌐 Global",
};

export const REGION_DISPLAY_OPTIONS: { id: AffiliateRegion; label: string }[] = [
  { id: "UK_IRELAND", label: "🇬🇧 UK & Ireland" },
  { id: "EUROPE",     label: "🌍 Europe" },
  { id: "AFRICA",     label: "🌍 Africa" },
  { id: "USA",        label: "🇺🇸 USA" },
  { id: "ASIA",       label: "🌏 Asia" },
  { id: "GLOBAL",     label: "🌐 Global (all)" },
];

const STORAGE_KEY = "affiliate_region_override";

export function timezoneToRegion(timezone: string): AffiliateRegion {
  if (timezone === "Europe/London" || timezone === "Europe/Dublin" || timezone === "Europe/Belfast") return "UK_IRELAND";
  if (timezone === "Europe/Berlin" || timezone === "Europe/Vienna" || timezone === "Europe/Zurich" || timezone === "Europe/Busingen") return "EUROPE_DE";
  if (timezone === "Europe/Madrid" || timezone === "Europe/Canary" || timezone === "Europe/Ceuta") return "EUROPE_ES";
  if (timezone === "Europe/Paris" || timezone === "Europe/Guadeloupe") return "EUROPE_FR";
  if (timezone === "Europe/Rome" || timezone === "Europe/Vatican" || timezone === "Europe/San_Marino") return "EUROPE_IT";
  if (timezone.startsWith("Europe/")) return "EUROPE";
  if (timezone.startsWith("Africa/")) return "AFRICA";
  if (timezone.startsWith("America/")) return "USA";
  if (timezone.startsWith("Asia/") || timezone.startsWith("Pacific/")) return "ASIA";
  return "GLOBAL";
}

export function filterByRegion<T extends { regions: string[] | null }>(
  partners: T[],
  region: AffiliateRegion,
): T[] {
  return partners.filter((p) => {
    const regions = p.regions ?? ["GLOBAL"];
    return regions.includes(region) || regions.includes("GLOBAL");
  });
}

export function useUserRegion() {
  const [region, setRegionState] = useState<AffiliateRegion>("GLOBAL");
  const [detected, setDetected] = useState<AffiliateRegion>("GLOBAL");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function init() {
      const timezones = Localization.getCalendars();
      const tz = timezones[0]?.timeZone ?? "UTC";
      const auto = timezoneToRegion(tz);
      setDetected(auto);

      const stored = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
      if (stored && Object.keys(REGION_LABELS).includes(stored)) {
        setRegionState(stored as AffiliateRegion);
      } else {
        setRegionState(auto);
      }
      setLoaded(true);
    }
    init();
  }, []);

  const setRegion = async (r: AffiliateRegion) => {
    setRegionState(r);
    await AsyncStorage.setItem(STORAGE_KEY, r).catch(() => {});
  };

  const resetToDetected = async () => {
    setRegionState(detected);
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  };

  return { region, setRegion, detected, loaded, resetToDetected };
}
