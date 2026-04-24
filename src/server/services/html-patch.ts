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
  const firstIndex = html.indexOf(search);
  if (firstIndex !== -1) {
    const lastIndex = html.lastIndexOf(search);
    if (firstIndex !== lastIndex) {
      console.warn(
        `Ambiguous edit patch: multiple matches found for search string (length ${search.length}). Replacing the first occurrence only.`
      );
    }
    return (
      html.slice(0, firstIndex) +
      replace +
      html.slice(firstIndex + search.length)
    );
  }

  // 2. Try whitespace-tolerant regex match
  const tolerantRegex = buildWhitespaceTolerantRegex(search);
  const matches = html.match(new RegExp(tolerantRegex.source, "g"));
  if (matches && matches.length > 0) {
    if (matches.length > 1) {
      console.warn(
        `Ambiguous whitespace-tolerant patch: ${matches.length} matches found. Replacing the first occurrence only.`
      );
    }
    return html.replace(tolerantRegex, replace);
  }

  // 3. Try after trimming leading/trailing whitespace from search lines
  const trimmedSearch = search
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  const firstTrimmedIndex = html.indexOf(trimmedSearch);
  if (firstTrimmedIndex !== -1) {
    const lastTrimmedIndex = html.lastIndexOf(trimmedSearch);
    if (firstTrimmedIndex !== lastTrimmedIndex) {
      console.warn(
        `Ambiguous trimmed-search patch: multiple matches found. Replacing the first occurrence only.`
      );
    }
    return (
      html.slice(0, firstTrimmedIndex) +
      replace +
      html.slice(firstTrimmedIndex + trimmedSearch.length)
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
