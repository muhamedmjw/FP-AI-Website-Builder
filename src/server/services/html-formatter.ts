/**
 * HTML Formatter — pretty-prints generated HTML before storage
 * so that the code editor shows readable, formatted code and
 * future AI edit patches match against well-structured whitespace.
 *
 * Uses Prettier with the HTML parser for robust, battle-tested formatting.
 */

import { format } from "prettier";

/**
 * Pretty-prints an HTML string using Prettier.
 * Returns the original HTML unchanged if formatting fails,
 * so a Prettier bug can never break the generation pipeline.
 */
export async function formatHtml(html: string): Promise<string> {
  if (!html || html.trim().length === 0) {
    return html;
  }

  try {
    const formatted = await format(html, {
      parser: "html",
      printWidth: 120,
      tabWidth: 2,
      useTabs: false,
      singleQuote: false,
      htmlWhitespaceSensitivity: "ignore",
      bracketSameLine: true,
      singleAttributePerLine: false,
    });

    return formatted;
  } catch (error) {
    // Never let a formatting failure break the pipeline.
    // The unformatted HTML is still perfectly valid for rendering.
    console.warn(
      "HTML formatting failed — serving unformatted HTML:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return html;
  }
}
