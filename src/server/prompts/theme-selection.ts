import type { LayoutType, WebsiteTheme } from "./theme-types";

/**
 * If the user mentions look/feel/colors/style, we keep fully random theme pick.
 * If they only describe *what* to build (no aesthetic), we bias toward layouts
 * that are less "generic stacked landing" (split, grid, asymmetric, etc.).
 */
const STYLE_OR_VISUAL_HINT_REGEX =
  /\b(style|styles|styled|theme|themes|aesthetic|aesthetics|look|looks|feel|feels|vibe|vibes|mood|palette|palettes|color|colors|colour|colours|minimal|minimalist|minimalism|bold|bolder|dark\s*mode|light\s*mode|neon|gradient|gradients|elegant|playful|corporate|luxury|luxurious|brutal|retro|vintage|modern|classic|warm|cool|pastel|monochrome|typography|font)\b/i;

const DYNAMIC_LAYOUTS: LayoutType[] = [
  "asymmetric",
  "split-screen",
  "full-bleed",
  "grid-heavy",
  "magazine",
  "masonry",
  "sidebar",
];

export function userMentionedStyleOrTheme(userMessage: string): boolean {
  return STYLE_OR_VISUAL_HINT_REGEX.test(userMessage);
}

export function pickThemeFromList(themes: WebsiteTheme[], userMessage: string): WebsiteTheme {
  if (themes.length === 0) {
    throw new Error("pickThemeFromList: empty theme list");
  }

  if (userMentionedStyleOrTheme(userMessage.trim())) {
    return themes[Math.floor(Math.random() * themes.length)]!;
  }

  const preferred = themes.filter((t) => DYNAMIC_LAYOUTS.includes(t.layout));
  if (preferred.length === 0) {
    return themes[Math.floor(Math.random() * themes.length)]!;
  }

  if (Math.random() < 0.68) {
    return preferred[Math.floor(Math.random() * preferred.length)]!;
  }

  return themes[Math.floor(Math.random() * themes.length)]!;
}
