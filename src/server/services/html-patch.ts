/**
 * HTML Patch Application — applies search-and-replace edit patches
 * returned by the AI to the original HTML document.
 *
 * Supports exact matching and whitespace-tolerant fallback matching.
 */

export type EditPatch = {
  search: string;
  replace: string;
};

export type PatchResult = {
  html: string;
  appliedCount: number;
  failedCount: number;
  failedPatches: string[];
};

/**
 * Normalizes whitespace for fuzzy matching: collapses runs of
 * whitespace (spaces, tabs, newlines) into a single space and trims.
 */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Escapes a string for use inside a RegExp.
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds a whitespace-tolerant regex from a search string.
 * Each whitespace run in the search becomes \s+ in the regex,
 * allowing flexible whitespace matching.
 */
function buildWhitespaceTolerantRegex(search: string): RegExp {
  const parts = search.split(/\s+/).filter(Boolean);
  const pattern = parts.map(escapeRegex).join("\\s+");
  return new RegExp(pattern);
}

/**
 * Applies a single edit patch to the HTML.
 * Returns the modified HTML or null if the patch couldn't be applied.
 */
function applySinglePatch(
  html: string,
  search: string,
  replace: string
): string | null {
  // 1. Try exact substring match
  const exactIndex = html.indexOf(search);
  if (exactIndex !== -1) {
    return (
      html.slice(0, exactIndex) +
      replace +
      html.slice(exactIndex + search.length)
    );
  }

  // 2. Try whitespace-tolerant regex match
  const tolerantRegex = buildWhitespaceTolerantRegex(search);
  if (tolerantRegex.test(html)) {
    return html.replace(tolerantRegex, replace);
  }

  // 3. Try after trimming leading/trailing whitespace from search lines
  const trimmedSearch = search
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  const trimmedIndex = html.indexOf(trimmedSearch);
  if (trimmedIndex !== -1) {
    return (
      html.slice(0, trimmedIndex) +
      replace +
      html.slice(trimmedIndex + trimmedSearch.length)
    );
  }

  return null;
}

/**
 * Applies a list of search-and-replace patches to an HTML document.
 * Patches are applied sequentially — each patch operates on the result
 * of the previous one.
 */
export function applyEditPatches(
  originalHtml: string,
  patches: EditPatch[]
): PatchResult {
  let html = originalHtml;
  let appliedCount = 0;
  let failedCount = 0;
  const failedPatches: string[] = [];

  for (const patch of patches) {
    if (!patch.search || patch.search.trim().length === 0) {
      failedCount++;
      failedPatches.push("(empty search)");
      continue;
    }

    const result = applySinglePatch(html, patch.search, patch.replace);

    if (result !== null) {
      html = result;
      appliedCount++;
    } else {
      failedCount++;
      failedPatches.push(
        patch.search.slice(0, 80) + (patch.search.length > 80 ? "..." : "")
      );
      console.warn(
        `Edit patch failed to match (search length: ${patch.search.length}):`,
        patch.search.slice(0, 120)
      );
    }
  }

  return { html, appliedCount, failedCount, failedPatches };
}
