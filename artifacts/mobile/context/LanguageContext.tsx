import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert, I18nManager, Platform } from "react-native";

import i18n, { RTL_LANGUAGES } from "@/lib/i18n";
import { setApiLanguage } from "@/lib/api";

export type Language = {
  code: string;
  flag: string;
  name: string;
  nativeName: string;
  claudeInstruction: string;
};

export const LANGUAGES: Language[] = [
  { code: "en",    flag: "🇬🇧", name: "English",        nativeName: "English",        claudeInstruction: "Respond in English." },
  { code: "fr",    flag: "🇫🇷", name: "French",         nativeName: "Français",       claudeInstruction: "Respond in French (Français) only." },
  { code: "es",    flag: "🇪🇸", name: "Spanish",        nativeName: "Español",        claudeInstruction: "Respond in Spanish (Español) only." },
  { code: "pt",    flag: "🇵🇹", name: "Portuguese",     nativeName: "Português",      claudeInstruction: "Respond in Portuguese (Português) only." },
  { code: "de",    flag: "🇩🇪", name: "German",         nativeName: "Deutsch",        claudeInstruction: "Respond in German (Deutsch) only." },
  { code: "it",    flag: "🇮🇹", name: "Italian",        nativeName: "Italiano",       claudeInstruction: "Respond in Italian (Italiano) only." },
  { code: "ar",    flag: "🇦🇪", name: "Arabic",         nativeName: "العربية",         claudeInstruction: "Respond in Arabic (العربية) only." },
  { code: "pcm",   flag: "🇳🇬", name: "Pidgin English", nativeName: "Pidgin",         claudeInstruction: "Respond in Nigerian Pidgin English only." },
  { code: "sw",    flag: "🇰🇪", name: "Swahili",        nativeName: "Swahili",        claudeInstruction: "Respond in Swahili only." },
  { code: "hi",    flag: "🇮🇳", name: "Hindi",          nativeName: "हिन्दी",           claudeInstruction: "Respond in Hindi (हिन्दी) only." },
  { code: "ko",    flag: "🇰🇷", name: "Korean",         nativeName: "한국어",           claudeInstruction: "Respond in Korean (한국어) only." },
  { code: "ja",    flag: "🇯🇵", name: "Japanese",       nativeName: "日本語",           claudeInstruction: "Respond in Japanese (日本語) only." },
  { code: "zh",    flag: "🇨🇳", name: "Chinese",        nativeName: "中文",             claudeInstruction: "Respond in Chinese (中文) only." },
  { code: "ru",    flag: "🇷🇺", name: "Russian",        nativeName: "Русский",        claudeInstruction: "Respond in Russian (Русский) only." },
  { code: "pt-BR", flag: "🇧🇷", name: "Portuguese BR",  nativeName: "Português BR",   claudeInstruction: "Respond in Brazilian Portuguese (Português Brasileiro) only." },
];

const STORAGE_KEY = "@app_language";
/** Legacy key used before global localization — migrated on first load. */
const LEGACY_STORAGE_KEY = "prediqsLanguage";

type TranslateOptions = Record<string, unknown>;

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  /** Translate a key (e.g. "tabs.dashboard"). Re-renders consumers on language change. */
  t: (key: string, options?: TranslateOptions) => string;
  /** Current locale code (e.g. "en", "ar"). */
  locale: string;
  /** Whether the active language is right-to-left. */
  isRTL: boolean;
};

const LanguageContext = createContext<LanguageContextType>({
  language: LANGUAGES[0],
  setLanguage: () => {},
  t: (key) => key,
  locale: LANGUAGES[0].code,
  isRTL: false,
});

/** Apply locale to i18n + outbound API requests. */
function applyLocale(code: string) {
  i18n.locale = code;
  setApiLanguage(code);
}

/**
 * Sync React Native's RTL layout direction to the selected language.
 * forceRTL only takes effect after a full reload, so on a user-initiated
 * change we prompt the user to restart. `silent` skips the prompt (used at boot).
 */
function applyDirection(code: string, silent: boolean, t: (k: string) => string) {
  const shouldRTL = RTL_LANGUAGES.includes(code);
  if (shouldRTL === I18nManager.isRTL) return;
  I18nManager.allowRTL(shouldRTL);
  I18nManager.forceRTL(shouldRTL);
  if (!silent && Platform.OS !== "web") {
    Alert.alert(t("profile.restartTitle"), t("profile.restartBody"), [{ text: "OK" }]);
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(LANGUAGES[0]);
  // Bumped on every locale change. Drives `t`'s identity so EVERY consumer
  // re-renders the instant the language changes — even when the same Language
  // object is re-selected or i18n's mutable `locale` is changed elsewhere.
  const [version, setVersion] = useState(0);

  // Bootstrap persisted language (with one-time migration from the legacy key).
  useEffect(() => {
    let mounted = true;
    (async () => {
      let code = await AsyncStorage.getItem(STORAGE_KEY);
      if (!code) {
        const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
          code = legacy;
          await AsyncStorage.setItem(STORAGE_KEY, legacy);
        }
      }
      const found = code ? LANGUAGES.find((l) => l.code === code) : undefined;
      const initial = found ?? LANGUAGES[0];
      applyLocale(initial.code);
      applyDirection(initial.code, true, (k) => i18n.t(k));
      if (mounted) {
        setLanguageState(initial);
        setVersion((v) => v + 1);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // New identity on every language change (via `version`) so memoized/blurred
  // consumers cannot hold on to a stale translator.
  const t = useCallback(
    (key: string, options?: TranslateOptions) => i18n.t(key, options),
    [version],
  );

  const setLanguage = useCallback((lang: Language) => {
    applyLocale(lang.code);
    AsyncStorage.setItem(STORAGE_KEY, lang.code);
    applyDirection(lang.code, false, (k) => i18n.t(k));
    setLanguageState(lang);
    setVersion((v) => v + 1);
  }, []);

  // Memoize so the provider hands consumers a fresh value object only when the
  // language (or translator identity) actually changes — and always does so then.
  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      locale: language.code,
      isRTL: RTL_LANGUAGES.includes(language.code),
    }),
    [language, setLanguage, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
