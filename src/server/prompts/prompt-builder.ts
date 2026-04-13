import fs from "fs";
import path from "path";

import { AI_CONFIG } from "@/shared/constants/ai";
import { AppLanguage, HistoryMessage } from "@/shared/types/database";
import {
  PERSONALITY,
  OUTPUT_FORMAT,
  APP_KNOWLEDGE,
  DESIGN_SYSTEM,
  MOBILE_RULES,
  RTL_RULES,
  IMAGE_RULES,
  WEBSITE_STRUCTURE,
  BUILD_MODE,
  EDIT_MODE,
  CHAT_MODE,
  buildSystemPrompt,
} from "./index";
import type { Category, WebsiteTheme } from "./index";
import { LANGUAGE_RULES as LANGUAGE_GUIDANCE } from "./language";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type PromptUserImage = {
  fileName: string;
  dataUri: string;
};

// Keep prompt payload size under model limits while still preserving recent uploads.
const MAX_USER_IMAGE_PROMPT_BYTES = 1.5 * 1024 * 1024;
const RECENT_USER_IMAGES_WHEN_OVERSIZED = 3;

const LAYOUT_DESCRIPTIONS: Record<string, string> = {
  "grid-heavy": "Use a dominant product/card grid as the main content area. Hero is compact. Sections are wide multi-column grids. Ideal for shops and galleries.",
  masonry:
    "Use a Pinterest-style masonry column layout for the main content. Cards vary in height. Use CSS column-count or a JS masonry library.",
  "single-column": "All content flows in a single centred column, max-width 720px. No sidebars. Typography-first.",
  sidebar:
    "Fixed-width sidebar on the left (or right for RTL) with main content beside it. Good for documentation, blogs with categories, or menus.",
  asymmetric:
    "Hero splits into two unequal halves (e.g. 55/45). Sections alternate text-left/image-right. Dynamic, energy-forward.",
  centered: "All sections are centred with generous padding. Hero is full-viewport centred. Clean and minimal.",
  "full-bleed": "Full-width sections with edge-to-edge backgrounds and images. No container max-width on hero and feature sections.",
  "split-screen": "Hero and key sections are split exactly 50/50 left/right panels. Contrasting backgrounds on each half.",
  magazine:
    "Multi-column editorial layout with large feature story, sidebars, and pull quotes. Newspaper-inspired.",
  newspaper:
    "Dense typographic grid, multiple stories per row, column dividers, large headline over a multi-column body.",
};

const LAYOUT_BLUEPRINTS: Record<string, string> = {
  "grid-heavy": [
    "Desktop blueprint:",
    "- Compact hero (2 columns: headline + featured card).",
    "- Primary content must be a dense 3-5 column card/product grid.",
    "- Use secondary grid bands for collections/categories.",
    "- Sidebar filters are optional but encouraged for catalog-like sites.",
  ].join("\n"),
  masonry: [
    "Desktop blueprint:",
    "- Hero can be minimal; focus on masonry feed quickly.",
    "- Main content must be masonry with variable card heights.",
    "- Add at least one highlighted oversized card/tile.",
    "- Use CSS columns or masonry-like grid behavior; avoid equal-height cards.",
  ].join("\n"),
  "single-column": [
    "Desktop blueprint:",
    "- One centered content column (max-width around 720px).",
    "- Narrative-first flow with strong typography rhythm.",
    "- Use separators, pull-quotes, and inline media blocks instead of multi-column grids.",
    "- Avoid sidebars and wide multi-column sections.",
  ].join("\n"),
  sidebar: [
    "Desktop blueprint:",
    "- Persistent sidebar for navigation/categories/filters.",
    "- Main content region adjacent to sidebar with independent scroll rhythm.",
    "- Sidebar position should respect direction (right side for RTL when appropriate).",
    "- Do not collapse into a single centered stack on desktop.",
  ].join("\n"),
  asymmetric: [
    "Desktop blueprint:",
    "- Hero split into uneven columns (e.g. 55/45 or 60/40).",
    "- Alternate section compositions left-heavy then right-heavy.",
    "- Mix image-first and text-first blocks for motion.",
    "- Avoid repeated same-width stacked sections.",
  ].join("\n"),
  centered: [
    "Desktop blueprint:",
    "- Strong centered hero and centered section intros.",
    "- Use varied section widths (narrow, medium, wide) for rhythm.",
    "- Pair centered headings with offset supporting elements.",
    "- Keep clean symmetry but avoid monotonous repeated blocks.",
  ].join("\n"),
  "full-bleed": [
    "Desktop blueprint:",
    "- Hero and major feature sections are full-bleed edge-to-edge.",
    "- Alternate full-bleed visual bands with contained content bands.",
    "- Use layered backgrounds, overlays, and strong section contrast.",
    "- Do not wrap all sections in the same narrow container.",
  ].join("\n"),
  "split-screen": [
    "Desktop blueprint:",
    "- Key sections must use 50/50 split panels.",
    "- Contrasting left/right backgrounds with clear content hierarchy.",
    "- Keep split geometry for hero and at least one additional section.",
    "- Avoid reverting to single-column except on mobile breakpoints.",
  ].join("\n"),
  magazine: [
    "Desktop blueprint:",
    "- Editorial front-page composition with one dominant lead story.",
    "- Supporting stories in multi-column blocks with varied card sizes.",
    "- Include side rail for highlights/tags/newsletter.",
    "- Use typographic hierarchy and separators like an editorial grid.",
  ].join("\n"),
  newspaper: [
    "Desktop blueprint:",
    "- Dense typographic multi-column body with strong headline hierarchy.",
    "- Add visible column rules/dividers and compact story cards.",
    "- Blend lead headline strip with clustered smaller stories.",
    "- Prefer textual density over oversized cards.",
  ].join("\n"),
};

function getGradientDirection(theme: WebsiteTheme): string {
  const personality = theme.personality.toLowerCase();

  if (/luxury|elegant|minimal|clean|corporate|medical/.test(personality)) {
    return "subtle";
  }
  if (/bold|energetic|playful|creative|neon|vibrant/.test(personality)) {
    return "bold";
  }

  return "balanced";
}

function buildVisualStyleInstruction(theme: WebsiteTheme): string {
  const gradientDirection = getGradientDirection(theme);

  return [
    "VISUAL STYLE DEPTH (MANDATORY):",
    "- Do not produce a flat plain-color site. Use layered visual depth.",
    `- Gradient intensity should be ${gradientDirection} based on theme personality.`,
    `- Use at least 2 gradients derived from theme colors (${theme.colors.primary}, ${theme.colors.secondary}, ${theme.colors.bg}).`,
    "- Apply one large atmospheric gradient background (hero or page backdrop).",
    "- Apply one interactive gradient treatment (buttons, badges, or callouts).",
    "- Add at least one elevated surface style: soft shadow + border + backdrop contrast.",
    "- Keep contrast and readability high; gradients must never hurt text legibility.",
  ].join("\n");
}

function buildLayoutInstruction(layout: string): string {
  const layoutDesc =
    LAYOUT_DESCRIPTIONS[layout] ??
    "Follow the selected theme layout style consistently across all sections.";
  const layoutBlueprint =
    LAYOUT_BLUEPRINTS[layout] ??
    "Desktop blueprint: Use clearly distinct section geometries and avoid repetitive stacked blocks.";

  return [
    "LAYOUT INSTRUCTION:",
    layoutDesc,
    "",
    layoutBlueprint,
    "",
    "Strictly follow this layout. Do not default to a generic hero + 3-column cards layout.",
    "On desktop, at least 3 sections must use visibly different structures (split, grid, feature band, sidebar, editorial, etc).",
    "When LAYOUT STYLE is magazine, newspaper, sidebar, grid-heavy, masonry, split-screen, or asymmetric, hero + three equal-width feature cards must not be the only desktop composition.",
  ].join("\n");
}

function buildPremiumOutputBar(isRtl: boolean): string {
  const rtlBlock = isRtl
    ? `
RTL / ARABIC / KURDISH — SAME VISUAL AMBITION AS ENGLISH:
- RTL is direction and mirroring only — NOT permission for a flat, generic, “template” stacked page.
- You MUST still deliver split heroes, editorial grids, asymmetric sections, dramatic typography, and the full personality of BASE THEME CSS.
- Mirror flex/grid direction and navigation order for RTL; keep the same section geometry and visual drama as a premium English site in this theme.
- For Arabic/Kurdish copy, use confident display typography (scale + weight contrast). Do not reduce the whole page to uniform small body text.
- Team/profile photos: set data-image-query to the depicted role (e.g. "professional lawyer portrait office") — never unrelated stock subjects.
`.trim()
    : "";

  return [
    "PREMIUM OUTPUT BAR (NON-NEGOTIABLE):",
    "- Aim for top-tier portfolio / editorial / high-end marketing quality — never a default landing-page cliché.",
    "- One strong hero moment, clear hierarchy, intentional whitespace, polished buttons and form fields, subtle motion (scroll reveal, hover states).",
    "- When the user does not specify colors or art direction, still ship premium work: follow BASE THEME CSS and DESIGN SYSTEM button/input minimums.",
    "- Forbidden as the entire desktop experience: repeated full-width bands with identical 3-column card grids only.",
    "- Honor BASE THEME CSS verbatim; extra CSS should refine details, not replace the theme system.",
    "- Theme selection is server-side: do not substitute a different visual system — express the locked theme through HTML structure and content.",
    rtlBlock,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function readThemeCssFile(category: Category, cssFileName: string): string | null {
  const filePath = path.join(
    process.cwd(),
    "src",
    "server",
    "prompts",
    "categories",
    category,
    "themes",
    cssFileName
  );

  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    console.warn(`Theme CSS not found: ${filePath}`);
    return null;
  }
}

function buildThemeInjection(
  theme: WebsiteTheme,
  category: string,
  baseThemeCss: string | null
): string {
  const layoutInstruction = buildLayoutInstruction(theme.layout);
  const visualStyleInstruction = buildVisualStyleInstruction(theme);

  const baseCssBlock =
    baseThemeCss && baseThemeCss.trim().length > 0
      ? `
BASE THEME CSS (REQUIRED — paste verbatim):
Put the following block inside <head> as the FIRST content of a single <style> element.
Do not omit, rewrite, or reorder this CSS. You may append small page-specific rules after it only.

---BEGIN_BASE_THEME_CSS---
${baseThemeCss.trim()}
---END_BASE_THEME_CSS---

Your HTML must use the class names and layout patterns defined in this stylesheet (including theme-specific classes like .menu-grid, .hero-content, etc.).
`.trim()
      : "";

  return `
═══════════════════════════════════════════
MANDATORY DESIGN BRIEF — READ BEFORE WRITING ANY HTML
═══════════════════════════════════════════
SELECTED THEME: ${theme.name} (id: ${theme.id})
CATEGORY: ${category}
PERSONALITY: ${theme.personality}
LAYOUT STYLE: ${theme.layout}

HEADING FONT: ${theme.fonts.heading}
BODY FONT: ${theme.fonts.body}
GOOGLE FONTS URL: ${theme.fonts.googleFontsUrl}

COLORS:
  Background:  ${theme.colors.bg}
  Surface:     ${theme.colors.surface}
  Primary:     ${theme.colors.primary}
  Secondary:   ${theme.colors.secondary}
  Text:        ${theme.colors.text}
  Muted:       ${theme.colors.muted}
  Border:      ${theme.colors.border}

${baseCssBlock}

CSS CLASS REMINDER (supplemental — the BASE THEME CSS defines the real class set):
  nav, .logo, nav ul, nav ul a
  .hero, .hero h1, .hero p
  .btn, .btn-primary
  section, .section-title
  .card, .card h3, .grid-3
  footer
  [data-scroll], .visible

ANIMATIONS: ${theme.animations.join(", ")}

${layoutInstruction}

${visualStyleInstruction}
═══════════════════════════════════════════
Ignoring this design brief = incorrect output. Follow it exactly.
═══════════════════════════════════════════
`.trim();
}

function mapHistoryToChatMessages(history: HistoryMessage[]): ChatMessage[] {
  return history
    .slice(-AI_CONFIG.MAX_HISTORY_TURNS)
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));
}

function buildUserImagesBlock(userImages?: PromptUserImage[]): string {
  if (!userImages || userImages.length === 0) {
    return "No user-uploaded images were provided.";
  }

  const estimateBytes = (dataUri: string) => {
    const payload = dataUri.split(",")[1]?.replace(/\s+/g, "") ?? "";
    if (!payload) {
      return 0;
    }

    const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
    return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
  };

  const totalBytes = userImages.reduce((sum, image) => {
    return sum + estimateBytes(image.dataUri);
  }, 0);

  const imagesForPrompt =
    totalBytes > MAX_USER_IMAGE_PROMPT_BYTES
      ? userImages.slice(-RECENT_USER_IMAGES_WHEN_OVERSIZED)
      : userImages;

  const pathLines = imagesForPrompt.map((image, index) => {
    return `Image ${index + 1}: ${image.fileName} - user uploaded image`;
  });

  return [
    `USER IMAGE ATTACHMENTS (${imagesForPrompt.length} images):`,
    `Below are the exact file paths for the uploaded images. The user may refer to these as "Image 1", "Image 2", etc. in their prompt.`,
    `You MUST map their references to the correct src paths provided below:`,
    ...pathLines.map((line) => `- ${line}`),
    `Ensure you use these EXACT src paths in your HTML <img> tags when implementing the user's requested content.`,
  ].join("\n");
}

/**
 * Builds the classifier prompt that decides whether the user wants build/edit/chat.
 */
export function buildClassifierMessages(
  userMessage: string,
  websiteLanguage: AppLanguage = "en",
  hasExistingWebsite = false
): ChatMessage[] {
  const existingSiteContext = hasExistingWebsite
    ? `

CONTEXT — website already exists in this chat (saved preview HTML is present):
- Prefer intent "edit" when the user asks to change, translate, fix, tweak, update, adjust, add, or remove something on the site, or to modify text, colors, layout, or CSS.
- Use "build" only when they clearly want a brand-new website or to discard the current site and start over.
- Use "chat" for greetings, questions, or conversation that does not imply changing the site.`
    : "";

  const system = `
You are an intent and language classifier.
Return ONLY raw JSON. No markdown. No explanation.

Intent values:
- "build" — user wants a new website
- "edit" — user wants to change an existing website
- "chat" — user is chatting, asking questions, or greeting

Language values: "en", "ar", "ku"

Arabic script disambiguation:
Arabic, Kurdish Sorani, and Persian all use Arabic script.
Use websiteLanguage hint to disambiguate: "${websiteLanguage}"
KURDISH SORANI - HIGHEST PRIORITY RULE:
If the input contains ANY of these Unicode characters: ۆ ێ ڕ ڵ
-> detectedLanguage MUST be "ku". No exceptions.
These characters are exclusive to Kurdish Sorani and do not appear in Arabic or Persian.
This rule overrides ALL other signals including the websiteLanguage hint.
- websiteLanguage "ar" → detectedLanguage "ar"
- websiteLanguage "ku" → detectedLanguage "ku"
- websiteLanguage "en" + Arabic script → "ar"
Gibberish in Arabic script → still classify by script.
${existingSiteContext}

Return exactly:
{"intent":"build","detectedLanguage":"en"}
`.trim();

  return [
    { role: "system", content: system },
    { role: "user", content: userMessage },
  ];
}

/**
 * Builds system and history messages for full website generation.
 */
export function buildGenerationMessages(
  history: HistoryMessage[],
  contentLanguage: AppLanguage,
  detectedUserLanguage: AppLanguage,
  userImages?: PromptUserImage[]
): ChatMessage[] {
  const isRtl = contentLanguage === "ar" || contentLanguage === "ku";
  const latestUserMessage =
    history.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const { theme, category } = buildSystemPrompt(latestUserMessage, contentLanguage);
  const currentYear = new Date().getFullYear();
  const baseThemeCss = readThemeCssFile(category, theme.cssFile);
  const themeInjection = buildThemeInjection(theme, category, baseThemeCss);

  const populatedBuildMode = BUILD_MODE
    .replace("{GOOGLE_FONTS_URL}", theme.fonts.googleFontsUrl)
    .replace("{BODY_FONT}", theme.fonts.body)
    .replace("{HEADING_FONT}", theme.fonts.heading)
    .replace("{USER_IMAGES_BLOCK}", buildUserImagesBlock(userImages));

  const websiteStructureForYear = WEBSITE_STRUCTURE.replaceAll(
    "{CURRENT_SITE_YEAR}",
    String(currentYear)
  );

  const systemParts = [
    PERSONALITY,
    `CURRENT_SITE_YEAR (authoritative footer copyright year): ${currentYear}`,
    themeInjection,
    buildPremiumOutputBar(isRtl),
    LANGUAGE_GUIDANCE,
    populatedBuildMode,
    DESIGN_SYSTEM,
    MOBILE_RULES,
    IMAGE_RULES,
    isRtl ? RTL_RULES : "",
    websiteStructureForYear,
    OUTPUT_FORMAT,
    `Website content language: ${contentLanguage}`,
    `Conversation reply language: ${detectedUserLanguage}`,
  ].filter(Boolean);

  const system = systemParts.join("\n\n");

  return [
    { role: "system", content: system },
    ...mapHistoryToChatMessages(history),
  ];
}

/**
 * Builds system and history messages for editing an existing website HTML.
 * Does not inject build-time theme/layout briefs — those cause full redesigns on small edit requests.
 */
export function buildEditMessages(
  history: HistoryMessage[],
  existingHtml: string,
  contentLanguage: AppLanguage,
  detectedUserLanguage: AppLanguage,
  userImages?: PromptUserImage[]
): ChatMessage[] {
  const isRtl = contentLanguage === "ar" || contentLanguage === "ku";
  const editModeWithImages = EDIT_MODE.replace(
    "{USER_IMAGES_BLOCK}",
    buildUserImagesBlock(userImages)
  );
  const hasUserUploads = (userImages?.length ?? 0) > 0;

  const currentYear = new Date().getFullYear();

  const systemParts = [
    PERSONALITY,
    `CURRENT_SITE_YEAR (authoritative footer copyright year): ${currentYear}`,
    LANGUAGE_GUIDANCE,
    editModeWithImages,
    hasUserUploads ? IMAGE_RULES : "",
    isRtl ? RTL_RULES : "",
    OUTPUT_FORMAT,
    `Website content language: ${contentLanguage}`,
    `Conversation reply language: ${detectedUserLanguage}`,
    `CURRENT HTML:\n${existingHtml}`,
  ].filter(Boolean);

  const system = systemParts.join("\n\n");

  return [
    { role: "system", content: system },
    ...mapHistoryToChatMessages(history),
  ];
}

/**
 * Builds conversational (non-HTML) assistant prompt messages.
 */
export function buildChatMessages(
  history: HistoryMessage[],
  detectedUserLanguage: AppLanguage
): ChatMessage[] {
  const system = [
    PERSONALITY,
    LANGUAGE_GUIDANCE,
    APP_KNOWLEDGE,
    CHAT_MODE,
    OUTPUT_FORMAT,
    `Conversation reply language: ${detectedUserLanguage}`,
  ].join("\n\n");

  return [
    { role: "system", content: system },
    ...mapHistoryToChatMessages(history),
  ];
}
