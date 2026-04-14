/**
 * Chat Title Service — generates localized titles for new chat
 * conversations using the AI model, with heuristic fallbacks.
 */

import type { AppLanguage } from "@/shared/types/database";
import { getDeepSeekClient, MODEL_CANDIDATES } from "./ai-client";

const TITLE_MAX_TOKENS = 60;
const TITLE_TEMPERATURE = 0.7;
const TITLE_MAX_CHARS = 70;
const TITLE_MAX_WORDS = 8;

// ── Localized fallback titles ──

const DEFAULT_TITLES: Record<AppLanguage, string> = {
  en: "New Chat",
  ar: "محادثة جديدة",
  ku: "چاتی نوێ",
};

// ── Language label for the system prompt ──

function getLanguageLabel(language: AppLanguage): string {
  if (language === "ar") return "Arabic";
  if (language === "ku") return "Kurdish Sorani";
  return "English";
}

// ── Gibberish detection ──

function isLikelyGibberish(input: string): boolean {
  const value = input.trim();

  if (!value) return true;

  // Only punctuation, symbols, numbers, or whitespace
  if (/^[\p{P}\p{S}\p{N}\s]+$/u.test(value)) return true;

  // Very short Latin-only strings (1-3 chars)
  if (/^[A-Za-z]{1,3}$/u.test(value)) return true;

  // Keyboard noise: no spaces, mixed alphanumeric + symbols
  if (
    /^[A-Za-z0-9]+[;:/\\|`~!@#$%^&*()_\-+=\[\]{}<>?,.][A-Za-z0-9;:/\\|`~!@#$%^&*()_\-+=\[\]{}<>?,.]*$/u.test(
      value
    ) &&
    !/\s/u.test(value)
  ) {
    return true;
  }

  const letters = value.match(/\p{L}/gu)?.length ?? 0;
  const nonWhitespace = value.replace(/\s/gu, "").length;

  if (letters === 0) return true;

  // For Arabic-script text, use a lower threshold since diacritics
  // and numbers are common in valid titles.
  const hasArabicScript = /\p{Script=Arabic}/u.test(value);
  const threshold = hasArabicScript ? 0.3 : 0.4;

  if (letters / nonWhitespace < threshold) return true;

  return false;
}

// ── Script detection ──

function isExpectedTitleLanguage(title: string, language: AppLanguage): boolean {
  if (!title.trim()) return false;

  const hasArabicScript = /\p{Script=Arabic}/u.test(title);
  const hasLatinScript = /\p{Script=Latin}/u.test(title);

  if (language === "ar" || language === "ku") {
    return hasArabicScript;
  }

  if (language === "en") {
    return hasLatinScript;
  }

  return true;
}

// ── Title casing (English only) ──

function toTitleCaseEnglish(input: string): string {
  const keepLower = new Set(["a", "an", "and", "for", "in", "of", "on", "or", "the", "to", "with"]);

  return input
    .toLowerCase()
    .split(/\s+/u)
    .filter(Boolean)
    .map((word, index) => {
      if (index > 0 && keepLower.has(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

// ── Heuristic title from user message ──

function buildHeuristicTitleFromMessage(
  userMessage: string,
  language: AppLanguage
): string | null {
  let source = userMessage
    .replace(/[\r\n\t]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  if (!source) return null;

  // Strip English filler words
  const enFillerPattern = /^(?:please|can you|could you|make me|build me|create|generate|design|i want|i need|make a|build a|a website for|website about)\s+/iu;
  while (enFillerPattern.test(source)) {
    source = source.replace(enFillerPattern, "").trim();
  }

  // Strip Arabic filler words
  const arFillerPattern = /^(?:أريد|أنشئ لي|صمم لي|أنشئ|صمم|اصنع لي|اصنع|من فضلك|لو سمحت|ممكن|عايز|أبغى|سوّ لي|سوّ)\s+/u;
  while (arFillerPattern.test(source)) {
    source = source.replace(arFillerPattern, "").trim();
  }

  // Strip Kurdish Sorani filler words
  const kuFillerPattern = /^(?:تکایە|دەمەوێ|بۆم دروست بکە|دروست بکە|دیزاین بکە|بمکە|بمسازە)\s+/u;
  while (kuFillerPattern.test(source)) {
    source = source.replace(kuFillerPattern, "").trim();
  }

  const words = source
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, TITLE_MAX_WORDS);

  if (words.length === 0) return null;

  const baseTitle = words.join(" ").trim().slice(0, TITLE_MAX_CHARS).trim();

  if (!isExpectedTitleLanguage(baseTitle, language)) return null;

  const hasArabicScript = /\p{Script=Arabic}/u.test(baseTitle);
  if (hasArabicScript) return baseTitle;

  return language === "en" ? toTitleCaseEnglish(baseTitle) : baseTitle;
}

// ── System prompt ──

function buildChatTitleSystemPrompt(languageLabel: string): string {
  return `You are a chat title generator for a website builder app.
Create a short, descriptive title (2 to 7 words) based on the user's
first message. Rules:
- Greetings (hello, hi, مرحبا, سڵاو, etc.) → short warm title like
  "Greetings" or "سڵاو" or "مرحباً"
- Website request → name the website type, e.g. "Restaurant Website",
  "وێبسایتی چێشتخانە", "موقع مطعم"
- Question → summarize in 2-5 words
- Unclear / very short → return a creative short title about the topic
- Title MUST be in ${languageLabel}
- Return ONLY the title text. No quotes. No punctuation at the end.
  No explanation. Nothing else.`;
}

// ── Model title validation ──

function normalizeModelChatTitle(
  rawTitle: string,
  preferredLanguage: AppLanguage
): string | null {
  const title = rawTitle
    .replace(/^[\"'`]+|[\"'`]+$/g, "")
    .replace(/[.!?،؛:]+$/u, "")
    .trim();

  const words = title.split(/\s+/u).filter(Boolean);
  const normalizedTitle = words.join(" ").trim();

  if (
    !normalizedTitle ||
    normalizedTitle.length > TITLE_MAX_CHARS ||
    words.length < 1 ||
    words.length > TITLE_MAX_WORDS ||
    isLikelyGibberish(normalizedTitle) ||
    !isExpectedTitleLanguage(normalizedTitle, preferredLanguage)
  ) {
    return null;
  }

  return preferredLanguage === "en"
    ? toTitleCaseEnglish(normalizedTitle)
    : normalizedTitle;
}

// ── Model call ──

async function getChatTitleFromModel(
  model: string,
  trimmedMessage: string,
  languageLabel: string,
  preferredLanguage: AppLanguage
): Promise<string | null> {
  const response = await getDeepSeekClient().chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: buildChatTitleSystemPrompt(languageLabel),
      },
      { role: "user", content: trimmedMessage },
    ],
    max_tokens: TITLE_MAX_TOKENS,
    temperature: TITLE_TEMPERATURE,
  });

  const rawTitle =
    typeof response.choices[0]?.message?.content === "string"
      ? response.choices[0].message.content
      : "";

  if (!rawTitle) return null;

  return normalizeModelChatTitle(rawTitle, preferredLanguage);
}

// ── Public API ──

/**
 * Produces a short localized title for a new chat conversation.
 * Tries AI models first, then falls back to a heuristic title
 * derived from the user's message.
 */
export async function generateChatTitle(
  userMessage: string,
  preferredLanguage: AppLanguage = "en"
): Promise<string> {
  const trimmedMessage = userMessage.trim();
  const defaultTitle = DEFAULT_TITLES[preferredLanguage] ?? DEFAULT_TITLES.en;
  const languageLabel = getLanguageLabel(preferredLanguage);

  // Try each configured model; accept the first validated title.
  for (const model of MODEL_CANDIDATES) {
    try {
      const nextTitle = await getChatTitleFromModel(
        model,
        trimmedMessage,
        languageLabel,
        preferredLanguage
      );

      if (nextTitle) return nextTitle;
    } catch {
      continue;
    }
  }

  // Fall back to a heuristic title derived from the user's message.
  const heuristicTitle = buildHeuristicTitleFromMessage(
    trimmedMessage,
    preferredLanguage
  );

  return heuristicTitle ?? defaultTitle;
}
