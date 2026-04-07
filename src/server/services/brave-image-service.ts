type BraveImageSearchResult = {
  url?: unknown;
  properties?: {
    url?: unknown;
  };
  thumbnail?: {
    src?: unknown;
  };
};

type BraveImageSearchResponse = {
  results?: unknown;
};

type HtmlImageMatch = {
  start: number;
  end: number;
  tag: string;
  src: string;
  alt: string;
};

type HtmlImageReplacement = {
  start: number;
  end: number;
  replacement: string;
};

type EnrichHtmlImageOptions = {
  context: string;
  maxImages?: number;
};

const BRAVE_SEARCH_API_KEY = process.env.BRAVE_SEARCH_API_KEY?.trim() ?? "";
const BRAVE_IMAGES_ENDPOINT = "https://api.search.brave.com/res/v1/images/search";
const BRAVE_TIMEOUT_MS = 7000;
const DEFAULT_MAX_IMAGES = 12;
const DEFAULT_RESULTS_PER_QUERY = 10;

const IMG_TAG_REGEX = /<img\b[^>]*>/gi;
const SRC_ATTR_REGEX = /\bsrc\s*=\s*(["'])(.*?)\1/i;
const ALT_ATTR_REGEX = /\balt\s*=\s*(["'])(.*?)\1/i;

const GENERIC_ALT_WORDS = new Set([
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

const REPLACEABLE_DOMAINS = [
  "source.unsplash.com",
  "picsum.photos",
  "placehold.co",
  "via.placeholder.com",
  "dummyimage.com",
  "example.com",
  "example.org",
  "example.net",
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeWhitespace(value: string): string {
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

  if (REPLACEABLE_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
    return true;
  }

  if (src.includes("{keyword}") || src.includes("your-image")) {
    return true;
  }

  return false;
}

function replaceSrcAttribute(tag: string, newSrc: string): string {
  const encodedSrc = newSrc.replace(/"/g, "&quot;");

  if (SRC_ATTR_REGEX.test(tag)) {
    return tag.replace(SRC_ATTR_REGEX, (_match, quote: string) => `src=${quote}${encodedSrc}${quote}`);
  }

  return tag.replace(/<img\b/i, `<img src="${encodedSrc}"`);
}

function normalizeQueryTerms(value: string): string {
  const terms = sanitizeWords(value)
    .split(" ")
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 && !GENERIC_ALT_WORDS.has(term));

  return normalizeWhitespace(terms.join(" "));
}

function buildImageSearchQuery(context: string, alt: string): string {
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

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function pickImageUrl(result: BraveImageSearchResult): string {
  const candidates = [
    asString(result.thumbnail?.src),
    asString(result.properties?.url),
    asString(result.url),
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const normalized = normalizeUrl(candidate);
    if (isRemoteHttpUrl(normalized) && !/\.svg(?:[?#].*)?$/i.test(normalized)) {
      return normalized;
    }
  }

  return "";
}

async function searchBraveImages(query: string, count: number): Promise<string[]> {
  if (!BRAVE_SEARCH_API_KEY) {
    return [];
  }

  const endpoint = new URL(BRAVE_IMAGES_ENDPOINT);
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("count", String(clamp(count, 1, 20)));
  endpoint.searchParams.set("safesearch", "strict");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BRAVE_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": BRAVE_SEARCH_API_KEY,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as BraveImageSearchResponse;
    const rawResults = Array.isArray(payload.results) ? payload.results : [];

    const urls = rawResults
      .map((item) => pickImageUrl(item as BraveImageSearchResult))
      .filter(Boolean);

    return Array.from(new Set(urls));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function collectImageMatches(html: string): HtmlImageMatch[] {
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
    });
  }

  return matches;
}

function applyReplacements(html: string, replacements: HtmlImageReplacement[]): string {
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

export function isBraveImageSearchEnabled(): boolean {
  return Boolean(BRAVE_SEARCH_API_KEY);
}

export async function enrichHtmlWithBraveImages(
  html: string,
  options: EnrichHtmlImageOptions
): Promise<string> {
  if (!isBraveImageSearchEnabled()) {
    return html;
  }

  const context = normalizeWhitespace(options.context);
  const maxImages = clamp(options.maxImages ?? DEFAULT_MAX_IMAGES, 1, 20);
  const matches = collectImageMatches(html).slice(0, maxImages);

  if (matches.length === 0) {
    return html;
  }

  const resultCache = new Map<string, Promise<string[]>>();
  const queryOffset = new Map<string, number>();
  const usedUrls = new Set<string>();
  const replacements: HtmlImageReplacement[] = [];

  for (const match of matches) {
    const query = buildImageSearchQuery(context, match.alt);

    if (!resultCache.has(query)) {
      resultCache.set(query, searchBraveImages(query, DEFAULT_RESULTS_PER_QUERY));
    }

    const results = await resultCache.get(query);
    if (!results || results.length === 0) {
      continue;
    }

    const startOffset = queryOffset.get(query) ?? 0;
    let selected = "";

    for (let attempt = 0; attempt < results.length; attempt++) {
      const index = (startOffset + attempt) % results.length;
      const candidate = results[index] ?? "";
      if (!candidate) {
        continue;
      }

      if (!usedUrls.has(candidate)) {
        selected = candidate;
        queryOffset.set(query, index + 1);
        break;
      }
    }

    if (!selected) {
      selected = results[startOffset % results.length] ?? "";
      queryOffset.set(query, startOffset + 1);
    }

    if (!selected) {
      continue;
    }

    usedUrls.add(selected);

    replacements.push({
      start: match.start,
      end: match.end,
      replacement: replaceSrcAttribute(match.tag, selected),
    });
  }

  return applyReplacements(html, replacements);
}
