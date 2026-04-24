import {
  applyImageReplacements,
  collectReplaceableImageMatches,
  replaceImageSrcInTag,
} from "@/server/services/html-stock-image-tags";
import { buildStockImageQuery, normalizeWhitespace } from "@/server/services/image-search-query";
import {
  isUnsplashImageSearchEnabled,
  searchUnsplashImageUrls,
} from "@/server/services/unsplash-image-service";

const DEFAULT_MAX_IMAGES = 12;
const DEFAULT_RESULTS_PER_QUERY = 10;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Resolves placeholder image URLs using the Unsplash API only.
 */
export async function enrichHtmlWithStockImages(
  html: string,
  options: { context: string; maxImages?: number; abortSignal?: AbortSignal }
): Promise<string> {
  if (!isUnsplashImageSearchEnabled()) {
    console.warn("Stock image enrichment skipped: set UNSPLASH_ACCESS_KEY in .env");
    return html;
  }

  const context = normalizeWhitespace(options.context);
  const maxImages = clamp(options.maxImages ?? DEFAULT_MAX_IMAGES, 1, 20);
  const matches = collectReplaceableImageMatches(html).slice(0, maxImages);

  if (matches.length === 0) {
    return html;
  }

  const resultCache = new Map<string, Promise<string[]>>();
  const queryOffset = new Map<string, number>();
  const usedUrls = new Set<string>();
  const replacements: { start: number; end: number; replacement: string }[] = [];

  const getUnsplashResults = async (query: string) => {
    if (options.abortSignal?.aborted) {
      return [];
    }

    if (!resultCache.has(query)) {
      resultCache.set(query, searchUnsplashImageUrls(query, DEFAULT_RESULTS_PER_QUERY, options.abortSignal));
    }
    const results = await resultCache.get(query);
    return results ?? [];
  };

  for (const match of matches) {
    if (options.abortSignal?.aborted) {
      break;
    }
    const query = buildStockImageQuery(context, match.alt, match.dataImageQuery);

    const results = await getUnsplashResults(query);

    if (results.length === 0) {
      console.warn(`Unsplash image enrichment skipped: no results for query "${query}".`);
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
      replacement: replaceImageSrcInTag(match.tag, selected),
    });
  }

  return applyImageReplacements(html, replacements);
}
