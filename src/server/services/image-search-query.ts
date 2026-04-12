/**
 * Shared helpers for building Unsplash stock-image search queries.
 */

export const GENERIC_ALT_WORDS = new Set([
  "image",
  "images",
  "photo",
  "photos",
  "picture",
  "pictures",
  "hero",
  "banner",
  "section",
  "cover",
  "background",
  "graphic",
  "visual",
  "img",
]);

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function sanitizeWords(value: string): string {
  return normalizeWhitespace(
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .replace(/_/g, " ")
  );
}

export function normalizeQueryTerms(value: string): string {
  const terms = sanitizeWords(value)
    .split(" ")
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 && !GENERIC_ALT_WORDS.has(term));

  return normalizeWhitespace(terms.join(" "));
}

export function buildShortContextQuery(context: string): string {
  const words = normalizeQueryTerms(context)
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (words.length === 0) {
    return "";
  }

  return normalizeWhitespace(words.join(" "));
}

/** Legacy: full chat context + alt (good for hero / broad scenes). */
export function buildImageSearchQuery(context: string, alt: string): string {
  const contextTerms = normalizeQueryTerms(context).slice(0, 120);
  const altTerms = normalizeQueryTerms(alt).slice(0, 80);

  if (contextTerms && altTerms) {
    return normalizeWhitespace(`${contextTerms} ${altTerms}`).slice(0, 160);
  }

  if (altTerms) {
    return altTerms.slice(0, 160);
  }

  if (contextTerms) {
    return contextTerms.slice(0, 160);
  }

  return "business website professional photography";
}

/**
 * Prefer subject-specific queries for cards/menu items (data-image-query, rich alt).
 * Fall back to context+alt for generic hero images.
 */
export function buildStockImageQuery(
  context: string,
  alt: string,
  dataImageQuery: string
): string {
  const dq = normalizeQueryTerms(dataImageQuery);
  if (dq.length >= 2) {
    const hint = buildShortContextQuery(context);
    const merged = hint ? normalizeWhitespace(`${hint} ${dq}`) : dq;
    return merged.slice(0, 160) || dq.slice(0, 160);
  }

  const altTerms = normalizeQueryTerms(alt);
  const altWords = altTerms.split(" ").filter(Boolean);
  const specificCount = altWords.length;

  if (specificCount >= 2) {
    const hint = buildShortContextQuery(context);
    const merged = hint ? normalizeWhitespace(`${hint} ${altTerms}`).trim() : altTerms;
    return merged.slice(0, 160) || altTerms.slice(0, 160);
  }

  return buildImageSearchQuery(context, alt);
}
