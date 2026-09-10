import translations from "./translations.json";
import { resolveDeviceLanguage } from "./locale";
export const languages = {
  zh: "简体中文",
  "zh-HK": "繁體中文",
  en: "English",
  ja: "日本語",
  ko: "한국어",
} as const;
export type Language = keyof typeof languages;
export type LanguagePreference = Language | "auto";
let preference: LanguagePreference = "auto";
const deviceLanguage = () => resolveDeviceLanguage(typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language]);
try {
  const saved = localStorage.getItem("legend-language");
  if (saved && Object.hasOwn(languages, saved)) preference = saved as Language;
} catch {
  /* Device storage is optional. */
}
let language: Language = preference === "auto" ? deviceLanguage() : preference;
const listeners = new Set<() => void>();
export const getLanguage = () => language;
export const getLanguagePreference = () => preference;
export function subscribeLanguage(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function setLanguage(value: LanguagePreference) {
  if (value !== "auto" && !Object.hasOwn(languages, value)) return;
  preference = value;
  language = value === "auto" ? deviceLanguage() : value;
  try {
    localStorage.setItem("legend-language", value);
  } catch {
    /* Keep session preference. */
  }
  if (typeof document !== "undefined")
    document.documentElement.lang = language === "zh" ? "zh-CN" : language;
  listeners.forEach((listener) => listener());
}
if (typeof window !== "undefined") window.addEventListener("languagechange", () => {
  if (preference === "auto") setLanguage("auto");
});
export function t(text: string): string {
  if (language === "zh") return text;
  const key = text.replace(/\s+/g, " ").trim();
  const values = (translations as Record<string, string[]>)[key];
  if (values) return values[{ en: 0, ja: 1, ko: 2, "zh-HK": 3 }[language]];
  for (const [pattern, translated] of Object.entries(translations)) {
    if (!pattern.includes("{n}")) continue;
    const [before, after] = pattern.split("{n}");
    if (key.startsWith(before) && key.endsWith(after)) {
      const number = key.slice(
        before.length,
        after ? -after.length : undefined,
      );
      if (/^\d+(?:\.\d+)?$/.test(number))
        return translated[{ en: 0, ja: 1, ko: 2, "zh-HK": 3 }[language]].replace(
          "{n}",
          number,
        );
    }
  }
  return text;
}
