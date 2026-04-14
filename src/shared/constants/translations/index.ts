/**
 * Translations barrel — re-exports the combined translation record and
 * the convenience `t()` lookup helper.
 */
import type { AppLanguage } from "@/shared/types/database";
import { en } from "./en";
import { ar } from "./ar";
import { ku } from "./ku";

export const translations: Record<AppLanguage, Record<string, string>> = {
  en,
  ar,
  ku,
};

/**
 * Look up a translation key for the given language.
 * Falls back to English, then returns the raw key if nothing matches.
 */
export function t(key: string, lang: AppLanguage): string {
  return translations[lang][key] ?? translations.en[key] ?? key;
}
