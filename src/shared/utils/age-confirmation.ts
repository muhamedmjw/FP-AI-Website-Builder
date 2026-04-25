import { translations } from "@/shared/constants/translations";
import type { AppLanguage } from "@/shared/types/database";

/**
 * Checks whether a user message is an age confirmation response.
 * Dynamically checks against confirmation phrases from all supported languages.
 * No hardcoded phrases — everything comes from the translation system.
 */
export function isAgeConfirmationMessage(message: string): boolean {
  const normalized = message.trim();
  if (!normalized) return false;

  const supportedLanguages: AppLanguage[] = ["en", "ar", "ku"];

  for (const lang of supportedLanguages) {
    const phrase = translations[lang]?.ageConfirmationPhrase;
    if (!phrase) continue;

    // Exact or near-exact match (case-insensitive for Latin script)
    if (normalizeForComparison(normalized) === normalizeForComparison(phrase)) {
      return true;
    }

    // Flexible match: check if the message contains the full confirmation phrase
    if (normalizeForComparison(normalized).includes(normalizeForComparison(phrase))) {
      return true;
    }
  }

  // Fallback: check for key tokens that indicate age confirmation in any language.
  // These are pulled from translations to stay dynamic.
  const hasAgeReference = normalized.includes("18") || normalized.includes("١٨");

  if (hasAgeReference) {
    const responsibilityTokens = supportedLanguages
      .map((lang) => translations[lang]?.ageConfirmationKeyword)
      .filter(Boolean);

    const hasResponsibilityToken = responsibilityTokens.some(
      (token) =>
        normalizeForComparison(normalized).includes(
          normalizeForComparison(token!)
        ) || normalized.includes(token!)
    );

    if (hasResponsibilityToken) {
      return true;
    }
  }

  return false;
}

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
