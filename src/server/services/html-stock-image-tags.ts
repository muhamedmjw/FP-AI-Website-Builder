import { normalizeWhitespace } from "@/server/services/image-search-query";

export type HtmlImageMatch = {
  start: number;
  end: number;
  tag: string;
  src: string;
  alt: string;
  dataImageQuery: string;
};

type HtmlImageReplacement = {
  start: number;
  end: number;
  replacement: string;
};

const IMG_TAG_REGEX = /<img\b[^>]*>/gi;
const SRC_ATTR_REGEX = /\bsrc\s*=\s*(["'])(.*?)\1/i;
const ALT_ATTR_REGEX = /\balt\s*=\s*(["'])(.*?)\1/i;
const DATA_IMAGE_QUERY_ATTR_REGEX = /\bdata-image-query\s*=\s*(["'])(.*?)\1/i;

/** Hostnames whose URLs are replaced during stock image enrichment. */
export const REPLACEABLE_IMAGE_DOMAINS = [
  "source.unsplash.com",
  "picsum.photos",
  "placehold.co",
  "via.placeholder.com",
  "dummyimage.com",
  "example.com",
  "example.org",
  "example.net",
];

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  return trimmed;
}

function isRemoteHttpUrl(value: string): boolean {
  const normalized = normalizeUrl(value);
  return /^https?:\/\//i.test(normalized);
}

function extractAttribute(tag: string, regex: RegExp): string {
  const match = tag.match(regex);
  if (!match) {
    return "";
  }

  return normalizeWhitespace(match[2] ?? "");
}

function shouldSkipSourceReplacement(src: string): boolean {
  if (!src) {
    return false;
  }

  const normalized = normalizeUrl(src).toLowerCase();

  if (
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:") ||
    normalized.startsWith("#") ||
    normalized.startsWith("/") ||
    normalized.startsWith("./") ||
    normalized.startsWith("../")
  ) {
    return true;
  }

  if (/\.svg(?:[?#].*)?$/i.test(normalized)) {
    return true;
  }

  if (!isRemoteHttpUrl(normalized)) {
    return true;
  }

  return false;
}

function hostnameFromUrl(urlValue: string): string {
  try {
    const parsed = new URL(normalizeUrl(urlValue));
    return parsed.hostname.toLowerCase();
  } catch {
    return "";
  }
}

function shouldReplaceSource(src: string): boolean {
  if (!src) {
    return true;
  }

  if (shouldSkipSourceReplacement(src)) {
    return false;
  }

  const hostname = hostnameFromUrl(src);

  if (!hostname) {
    return true;
  }

  if (
    REPLACEABLE_IMAGE_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    )
  ) {
    return true;
  }

  if (src.includes("{keyword}") || src.includes("your-image")) {
    return true;
  }

  return false;
}

export function replaceImageSrcInTag(tag: string, newSrc: string): string {
  const encodedSrc = newSrc.replace(/"/g, "&quot;");

  if (SRC_ATTR_REGEX.test(tag)) {
    return tag.replace(SRC_ATTR_REGEX, (_match, quote: string) => `src=${quote}${encodedSrc}${quote}`);
  }

  return tag.replace(/<img\b/i, `<img src="${encodedSrc}"`);
}

export function collectReplaceableImageMatches(html: string): HtmlImageMatch[] {
  const matches: HtmlImageMatch[] = [];

  for (const match of html.matchAll(IMG_TAG_REGEX)) {
    const tag = match[0] ?? "";
    const start = match.index ?? -1;
    if (!tag || start < 0) {
      continue;
    }

    const src = extractAttribute(tag, SRC_ATTR_REGEX);
    if (!shouldReplaceSource(src)) {
      continue;
    }

    matches.push({
      start,
      end: start + tag.length,
      tag,
      src,
      alt: extractAttribute(tag, ALT_ATTR_REGEX),
      dataImageQuery: extractAttribute(tag, DATA_IMAGE_QUERY_ATTR_REGEX),
    });
  }

  return matches;
}

export function applyImageReplacements(html: string, replacements: HtmlImageReplacement[]): string {
  if (replacements.length === 0) {
    return html;
  }

  let output = html;
  const sorted = [...replacements].sort((a, b) => b.start - a.start);

  for (const replacement of sorted) {
    output = `${output.slice(0, replacement.start)}${replacement.replacement}${output.slice(replacement.end)}`;
  }

  return output;
}
