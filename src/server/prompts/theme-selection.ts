import type { LayoutType } from "./theme-types";

/**
 * Layout types available for creative design.
 * The AI writes all CSS itself — these just guide the structural approach.
 */
const ALL_LAYOUTS: LayoutType[] = [
  "centered",
  "asymmetric",
  "grid-heavy",
  "full-bleed",
  "sidebar",
  "magazine",
  "masonry",
  "split-screen",
  "single-column",
  "newspaper",
];

const DYNAMIC_LAYOUTS: LayoutType[] = [
  "asymmetric",
  "split-screen",
  "full-bleed",
  "grid-heavy",
  "magazine",
  "masonry",
  "sidebar",
];

const STYLE_OR_VISUAL_HINT_REGEX =
  /\b(style|styles|styled|theme|themes|aesthetic|aesthetics|look|looks|feel|feels|vibe|vibes|mood|palette|palettes|color|colors|colour|colours|minimal|minimalist|minimalism|bold|bolder|dark\s*mode|light\s*mode|neon|gradient|gradients|elegant|playful|corporate|luxury|luxurious|brutal|retro|vintage|modern|classic|warm|cool|pastel|monochrome|typography|font)\b/i;

export function userMentionedStyleOrTheme(userMessage: string): boolean {
  return STYLE_OR_VISUAL_HINT_REGEX.test(userMessage);
}

/**
 * Picks a random layout style for the AI to follow.
 * If the user mentions style/theme hints → fully random from all layouts.
 * If the user only describes *what* to build → bias toward dynamic layouts.
 */
export function pickRandomLayout(userMessage: string): LayoutType {
  if (userMentionedStyleOrTheme(userMessage.trim())) {
    return ALL_LAYOUTS[Math.floor(Math.random() * ALL_LAYOUTS.length)]!;
  }

  // Bias toward dynamic layouts when user doesn't mention style
  if (Math.random() < 0.68) {
    return DYNAMIC_LAYOUTS[Math.floor(Math.random() * DYNAMIC_LAYOUTS.length)]!;
  }

  return ALL_LAYOUTS[Math.floor(Math.random() * ALL_LAYOUTS.length)]!;
}
