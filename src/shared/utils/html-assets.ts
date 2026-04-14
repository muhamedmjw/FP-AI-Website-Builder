/**
 * Split inline <style> / <script> from a self-contained HTML document into virtual assets,
 * and merge back. Matches deploy ZIP layout: assets/css/styles.css, assets/js/main.js.
 */

export const STYLESHEET_LINK_MARKER =
  '<link rel="stylesheet" href="css/styles.css">';

export const MAIN_SCRIPT_MARKER = '<script src="js/main.js"></script>';

export type SplitHtmlDocumentAssetsResult = {
  indexHtml: string;
  css: string;
  js: string;
};

/**
 * First <style>...</style> becomes external CSS reference; last inline <script>...</script> becomes main.js reference.
 */
export function splitHtmlDocumentAssets(html: string): SplitHtmlDocumentAssetsResult {
  let processedHtml = html;
  let css = "";
  let js = "";

  const styleMatch = processedHtml.match(/<style>([\s\S]*?)<\/style>/i);
  if (styleMatch) {
    css = styleMatch[1].trim();
    processedHtml = processedHtml.replace(styleMatch[0], STYLESHEET_LINK_MARKER);
  } else if (processedHtml.includes(STYLESHEET_LINK_MARKER)) {
    css = "";
  }

  const scriptMatches = [...processedHtml.matchAll(/<script>[\s\S]*?<\/script>/gi)];
  if (scriptMatches.length > 0) {
    const lastScript = scriptMatches[scriptMatches.length - 1];
    const jsContent = lastScript[0]
      .replace(/^<script>/i, "")
      .replace(/<\/script>$/i, "")
      .trim();

    if (jsContent) {
      js = jsContent;
      processedHtml = processedHtml.replace(lastScript[0], MAIN_SCRIPT_MARKER);
    }
  } else if (processedHtml.includes(MAIN_SCRIPT_MARKER)) {
    js = "";
  }

  return {
    indexHtml: processedHtml,
    css,
    js,
  };
}

/**
 * Inverse of splitHtmlDocumentAssets: restores inline <style> and <script> for preview, storage, and AI prompts.
 */
export function mergeHtmlDocumentAssets(
  indexHtml: string,
  css: string,
  js: string
): string {
  let out = indexHtml;

  if (out.includes(STYLESHEET_LINK_MARKER)) {
    const replacement = `<style>${css}</style>`;
    out = out.split(STYLESHEET_LINK_MARKER).join(replacement);
  } else if (css.length > 0) {
    out = out.replace(/<\/head>/i, `<style>${css}</style>\n</head>`);
  }

  if (out.includes(MAIN_SCRIPT_MARKER)) {
    const replacement = `<script>${js}</script>`;
    out = out.split(MAIN_SCRIPT_MARKER).join(replacement);
  } else if (js.length > 0) {
    out = out.replace(/<\/body>/i, `<script>${js}</script>\n</body>`);
  }

  return out;
}

/** Alias for deploy route — same behavior as splitHtmlDocumentAssets with legacy property names */
export function extractAssetsFromHtml(html: string): {
  processedHtml: string;
  extractedCss: string;
  extractedJs: string;
} {
  const { indexHtml, css, js } = splitHtmlDocumentAssets(html);
  return {
    processedHtml: indexHtml,
    extractedCss: css,
    extractedJs: js,
  };
}
