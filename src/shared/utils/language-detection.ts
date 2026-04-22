import { AppLanguage } from "../types/database";

/**
 * Detects the language of a given text string.
 * Supports English (en), Kurdish Sorani (ku), and Arabic (ar).
 * Defaults to "en" if no strong match is found.
 */
export function detectPromptLanguage(text: string): AppLanguage {
  if (!text) return "en";

  // Arabic characters range: \u0600-\u06FF
  // Kurdish Sorani uses Arabic script with additional characters like پ, چ, ڤ, گ, ژ, ڕ, ڵ, ۆ, ێ
  const hasArabicScript = /[\u0600-\u06FF]/.test(text);

  if (!hasArabicScript) {
    return "en";
  }

  // Specific Kurdish Sorani characters that distinguish it from standard Arabic
  // پ (067E), چ (0686), ڤ (06ڤ), گ (06گ), ژ (0698), ڕ (06RR), ڵ (06LL), ۆ (06ۆ), ێ (06ێ)
  const kurdishSpecificChars = /[\u067E\u0686\u06A4\u06AF\u0698\u0621\u06CC\u06CE\u06D5\u06D0\u06C6]/;
  
  // Note: Kurdish Sorani also uses distinctive spelling patterns.
  // We check for some common Kurdish words if script is ambiguous.
  const kurdishKeywords = /\b(بۆ|لە|وە|ئە|وەک|بکات|دەکات|هەیە|نییە|بۆچی)\b/i;

  if (kurdishSpecificChars.test(text) || kurdishKeywords.test(text)) {
    return "ku";
  }

  // If it's Arabic script but not specifically Kurdish, assume Arabic
  return "ar";
}
