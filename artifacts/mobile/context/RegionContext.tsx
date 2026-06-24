import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";

import {
  AffiliateRegion,
  REGION_LABELS,
  filterByRegion,
  timezoneToRegion,
} from "@/hooks/useUserRegion";

const STORAGE_KEY = "affiliate_region_override";

interface RegionContextType {
  region: AffiliateRegion;
  detected: AffiliateRegion;
  loaded: boolean;
  regionLabel: string;
  setRegion: (r: AffiliateRegion) => Promise<void>;
  resetToDetected: () => Promise<void>;
  filterByRegion: <T extends { regions: string[] | null }>(partners: T[]) => T[];
}

const RegionContext = createContext<RegionContextType>({
  region: "GLOBAL",
  detected: "GLOBAL",
  loaded: false,
  regionLabel: "🌐 Global",
  setRegion: async () => {},
  resetToDetected: async () => {},
  filterByRegion: (p) => p,
});

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [region, setRegionState] = useState<AffiliateRegion>("GLOBAL");
  const [detected, setDetected] = useState<AffiliateRegion>("GLOBAL");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function init() {
      // Localization.getCalendars() is a native call; guard it so a native
      // failure on launch can never crash the app — fall back to UTC/GLOBAL.
      let auto: AffiliateRegion = "GLOBAL";
      try {
        const tz = Localization.getCalendars()[0]?.timeZone ?? "UTC";
        auto = timezoneToRegion(tz);
      } catch {
        auto = "GLOBAL";
      }
      setDetected(auto);

      const stored = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
      if (stored && Object.keys(REGION_LABELS).includes(stored)) {
        setRegionState(stored as AffiliateRegion);
      } else {
        setRegionState(auto);
      }
      setLoaded(true);
    }
    init().catch(() => setLoaded(true));
  }, []);

  const setRegion = useCallback(async (r: AffiliateRegion) => {
    setRegionState(r);
    await AsyncStorage.setItem(STORAGE_KEY, r).catch(() => {});
  }, []);

  const resetToDetected = useCallback(async () => {
    setRegionState(detected);
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, [detected]);

  const filter = useCallback(
    <T extends { regions: string[] | null }>(partners: T[]): T[] =>
      filterByRegion(partners, region),
    [region],
  );

  return (
    <RegionContext.Provider
      value={{
        region,
        detected,
        loaded,
        regionLabel: REGION_LABELS[region],
        setRegion,
        resetToDetected,
        filterByRegion: filter,
      }}
    >
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  return useContext(RegionContext);
}
