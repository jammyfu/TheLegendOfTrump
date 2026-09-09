import translations from "./translations.json";
export const languages = {
  zh: "简体中文",
  "zh-HK": "繁體中文（香港）",
  en: "English",
  ja: "日本語",
  ko: "한국어",
} as const;
export type Language = keyof typeof languages;
let language: Language = "zh";
try {
  const saved = localStorage.getItem("legend-language");
  if (saved && saved in languages) language = saved as Language;
} catch {
  /* Device storage is optional. */
}
const listeners = new Set<() => void>();
export const getLanguage = () => language;
export function subscribeLanguage(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function setLanguage(value: Language) {
  if (!(value in languages)) return;
  language = value;
  try {
    localStorage.setItem("legend-language", value);
  } catch {
    /* Keep session preference. */
  }
  if (typeof document !== "undefined")
    document.documentElement.lang = value === "zh" ? "zh-CN" : value;
  listeners.forEach((listener) => listener());
}
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
      if (/^\d+$/.test(number))
        return translated[{ en: 0, ja: 1, ko: 2, "zh-HK": 3 }[language]].replace(
          "{n}",
          number,
        );
    }
  }
  return text;
}
