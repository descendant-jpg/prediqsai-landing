import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

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

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
};

const LanguageContext = createContext<LanguageContextType>({
  language: LANGUAGES[0],
  setLanguage: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(LANGUAGES[0]);

  useEffect(() => {
    AsyncStorage.getItem("prediqsLanguage").then((code) => {
      if (code) {
        const found = LANGUAGES.find((l) => l.code === code);
        if (found) setLanguageState(found);
      }
    });
  }, []);

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    AsyncStorage.setItem("prediqsLanguage", lang.code);
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
