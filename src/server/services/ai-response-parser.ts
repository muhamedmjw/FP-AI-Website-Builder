/**
 * AI Response Parser — handles parsing raw model output into typed
 * response objects (website HTML, edit patches, or follow-up questions).
 */

import type { AppLanguage } from "@/shared/types/database";

import { t } from "@/shared/constants/translations";

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

function extractHtmlFallback(raw: string): string | null {
  const startIndex = raw.search(/<!DOCTYPE html>|<html[\s>]/i);
  if (startIndex === -1) return null;

  let endIndex = raw.lastIndexOf("</html>");
  if (endIndex === -1) {
    // If no closing tag, it might be truncated. Take the rest of the string.
    endIndex = raw.length;
  } else {
    endIndex += 7; // length of "</html>"
  }

  let html = raw.slice(startIndex, endIndex);

  // If the HTML was embedded inside a JSON string, it will likely have JSON-escaped quotes and newlines.
  // We unescape them here so the HTML renders correctly.
  if (html.includes('\\"') || html.includes('\\n')) {
    html = html
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\');
  }

  return html;
}

function extractMessageFallback(raw: string): string | null {
  // Try to find a "message" field in the broken JSON
  const messageMatch = raw.match(/"message"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
  if (messageMatch && messageMatch[1]) {
    let msg = messageMatch[1];
    if (msg.includes('\\"') || msg.includes('\\n')) {
      msg = msg.replace(/\\"/g, '"').replace(/\\n/g, '\n');
    }
    return msg;
  }
  return null;
}

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

function classifyParsedResponse(parsed: Record<string, unknown>, language: AppLanguage = "en"): AIResponse | null {
  // Handle website_edit (patch-based edits)
  if (parsed.type === "website_edit" && isValidEditChanges(parsed.changes)) {
    return {
      type: "website_edit",
      changes: parsed.changes as Array<{ search: string; replace: string }>,
      message:
        typeof parsed.message === "string"
          ? parsed.message
          : t("generatingEditSuccess", language),
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
          : t("generatingWebsiteSuccess", language),
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

export function parseAIResponse(raw: string, language: AppLanguage = "en"): AIResponse {
  let cleaned = raw.trim();

  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Try direct parse
  const directParsed = tryParseJson(cleaned);
  if (directParsed) {
    const classified = classifyParsedResponse(directParsed, language);
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
      const classified = classifyParsedResponse(extracted, language);
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
      const message = raw.replace(htmlFenceMatch[0], "").trim() || t("generatingWebsiteSuccess", language);
      return {
        type: "website",
        html,
        message: message.length > 500 ? t("generatingWebsiteSuccess", language) : message,
      };
    }
  }

  // FALLBACK 2: If the entire raw string contains valid HTML tags
  if (validateWebsiteHtml(raw)) {
    const extractedHtml = extractHtmlFallback(raw);
    const extractedMessage = extractMessageFallback(raw);
    
    if (extractedHtml) {
      return {
        type: "website",
        html: extractedHtml,
        message: extractedMessage || t("generatingWebsiteSuccess", language),
      };
    }
  }

  return {
    type: "questions",
    message: raw,
  };
}
