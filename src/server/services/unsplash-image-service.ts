const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY?.trim() ?? "";
const UNSPLASH_SEARCH_ENDPOINT = "https://api.unsplash.com/search/photos";
const UNSPLASH_TIMEOUT_MS = 8000;

type UnsplashSearchResponse = {
  results?: Array<{
    urls?: {
      regular?: string;
      small?: string;
      thumb?: string;
    };
  }>;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function pickUnsplashUrl(result: NonNullable<UnsplashSearchResponse["results"]>[0]): string {
  const urls = result?.urls;
  if (!urls) {
    return "";
  }
  return (urls.regular || urls.small || urls.thumb || "").trim();
}

export function isUnsplashImageSearchEnabled(): boolean {
  return Boolean(UNSPLASH_ACCESS_KEY);
}

export async function searchUnsplashImageUrls(
  query: string,
  count: number
): Promise<string[]> {
  if (!isUnsplashImageSearchEnabled()) {
    return [];
  }

  const q = query.replace(/\s+/gu, " ").trim();
  if (!q) {
    return [];
  }

  const endpoint = new URL(UNSPLASH_SEARCH_ENDPOINT);
  endpoint.searchParams.set("query", q);
  endpoint.searchParams.set("per_page", String(clamp(count, 1, 30)));
  endpoint.searchParams.set("content_filter", "high");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UNSPLASH_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as UnsplashSearchResponse;
    const rawResults = Array.isArray(payload.results) ? payload.results : [];

    const urls = rawResults.map((item) => pickUnsplashUrl(item)).filter(Boolean);

    return Array.from(new Set(urls));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
