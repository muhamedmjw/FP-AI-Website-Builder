/**
 * AI Response Parser — handles parsing raw model output into typed
 * response objects (website HTML, edit patches, or follow-up questions).
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

export type AIResponseEdit = {
  type: "website_edit";
  changes: Array<{ search: string; replace: string }>;
  message: string;
};

export type AIResponse = AIResponseQuestions | AIResponseWebsite | AIResponseEdit;

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

function isValidEditChanges(
  value: unknown
): value is Array<{ search: string; replace: string }> {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }

  return value.every(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof item.search === "string" &&
      item.search.length > 0 &&
      typeof item.replace === "string"
  );
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

function tryParseJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function classifyParsedResponse(parsed: Record<string, unknown>): AIResponse | null {
  // Handle website_edit (patch-based edits)
  if (parsed.type === "website_edit" && isValidEditChanges(parsed.changes)) {
    return {
      type: "website_edit",
      changes: parsed.changes as Array<{ search: string; replace: string }>,
      message:
        typeof parsed.message === "string"
          ? parsed.message
          : "Edit applied successfully.",
    };
  }

  // Handle full website HTML
  if (parsed.type === "website" && typeof parsed.html === "string") {
    return {
      type: "website",
      html: parsed.html,
      message:
        typeof parsed.message === "string"
          ? parsed.message
          : "Website generated successfully.",
    };
  }

  // Handle questions / chat
  if (parsed.type === "questions" && typeof parsed.message === "string") {
    return {
      type: "questions",
      message: parsed.message,
    };
  }

  return null;
}

export function parseAIResponse(raw: string): AIResponse {
  let cleaned = raw.trim();

  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Try direct parse
  const directParsed = tryParseJson(cleaned);
  if (directParsed) {
    const classified = classifyParsedResponse(directParsed);
    if (classified) {
      return classified;
    }

    return {
      type: "questions",
      message:
        typeof directParsed.message === "string"
          ? directParsed.message
          : (typeof directParsed.text === "string" ? directParsed.text : raw),
    };
  }

  // Attempt to extract JSON from text if direct parsing fails
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const potentialJson = raw.slice(firstBrace, lastBrace + 1);
    const extracted = tryParseJson(potentialJson);

    if (extracted) {
      const classified = classifyParsedResponse(extracted);
      if (classified) {
        return classified;
      }
    }
  }

  // FALLBACK: If no JSON found, look for HTML code block
  const htmlFenceMatch = raw.match(/```html\s*\n?([\s\S]*?)\n?\s*```/i);
  if (htmlFenceMatch) {
    const html = htmlFenceMatch[1].trim();
    if (validateWebsiteHtml(html)) {
      const message = raw.replace(htmlFenceMatch[0], "").trim() || "Website generated successfully.";
      return {
        type: "website",
        html,
        message: message.length > 500 ? "Website generated successfully." : message,
      };
    }
  }

  // FALLBACK 2: If the entire raw string looks like valid HTML
  if (validateWebsiteHtml(raw)) {
    return {
      type: "website",
      html: raw,
      message: "Website generated successfully.",
    };
  }

  return {
    type: "questions",
    message: raw,
  };
}
