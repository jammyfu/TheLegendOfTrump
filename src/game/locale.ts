import type { Language } from "./i18n";
export function resolveDeviceLanguage(preferences: readonly string[]): Language {
  for (const preference of preferences) {
    const tag = preference.toLowerCase().replace(/_/g, "-");
    const base = tag.split("-")[0];
    if (base === "zh") {
      if (tag.includes("hans")) return "zh";
      return /(?:^|-)(hant|tw|hk|mo)(?:-|$)/.test(tag) ? "zh-HK" : "zh";
    }
    if (base === "en" || base === "ja" || base === "ko") return base;
  }
  return "en";
}
