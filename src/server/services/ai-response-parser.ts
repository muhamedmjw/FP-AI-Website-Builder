/**
 * AI Response Parser — handles parsing raw model output into typed
 * response objects (website HTML or follow-up questions).
 */

import type { AppLanguage } from "@/shared/types/database";

// ── Response types ──

export type AIResponseQuestions = {
  type: "questions";
  message: string;
};

export type AIResponseWebsite = {
  type: "website";
  html: string;
  message: string;
};

export type AIResponse = AIResponseQuestions | AIResponseWebsite;

// ── Classifier types ──

type ClassifiedIntent = "build" | "edit" | "chat";

export type ClassifierResult = {
  intent: ClassifiedIntent;
  detectedLanguage: AppLanguage;
};

// ── Helpers ──

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === "en" || value === "ar" || value === "ku";
}

export function isClassifiedIntent(value: unknown): value is ClassifiedIntent {
  return value === "build" || value === "edit" || value === "chat";
}

export function stripCodeFences(raw: string): string {
  const cleaned = raw.trim();
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return cleaned;
}

export function looksLikeBadJson(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("```");
}

export function validateWebsiteHtml(html: string): boolean {
  if (!html || html.trim().length < 500) return false;

  const hasDoctype = /<html[\s>]/i.test(html);
  const hasClosingHtml = /<\/html>/i.test(html);
  const hasBody = /<body[\s>]/i.test(html) && /<\/body>/i.test(html);
  const hasHead = /<head[\s>]/i.test(html);
  const hasSomeContent =
    /<(div|section|main|article|header|nav|footer|h1|h2|p)[^>]*>/i.test(html);

  return hasDoctype && hasClosingHtml && hasBody && hasHead && hasSomeContent;
}

// ── Parsers ──

export function parseClassifierResult(raw: string): ClassifierResult | null {
  try {
    const parsed = JSON.parse(stripCodeFences(raw));
    const intent = isClassifiedIntent(parsed?.intent) ? parsed.intent : null;
    const detectedLanguageValue = parsed?.detectedLanguage ?? parsed?.language;
    const detectedLanguage = isAppLanguage(detectedLanguageValue)
      ? detectedLanguageValue
      : null;

    if (!intent || !detectedLanguage) {
      return null;
    }

    return {
      intent,
      detectedLanguage,
    };
  } catch {
    return null;
  }
}

export function parseAIResponse(raw: string): AIResponse {
  let cleaned = raw.trim();

  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(cleaned);

    if (parsed.type === "website" && typeof parsed.html === "string") {
      return {
        type: "website",
        html: parsed.html,
        message: parsed.message ?? "Website generated successfully.",
      };
    }

    if (parsed.type === "questions" && typeof parsed.message === "string") {
      return {
        type: "questions",
        message: parsed.message,
      };
    }

    return {
      type: "questions",
      message: parsed.message ?? parsed.text ?? raw,
    };
  } catch {
    // Attempt to extract JSON from text if direct parsing fails
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        const potentialJson = raw.slice(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(potentialJson);

        if (parsed.type === "website" && typeof parsed.html === "string") {
          return {
            type: "website",
            html: parsed.html,
            message: parsed.message ?? "Website generated successfully.",
          };
        }

        if (parsed.type === "questions" && typeof parsed.message === "string") {
          return {
            type: "questions",
            message: parsed.message,
          };
        }
      } catch {
        // Fall through to default
      }
    }

    return {
      type: "questions",
      message: raw,
    };
  }
}
