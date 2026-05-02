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
  REDESIGN_MODE,
  CHAT_MODE,
  detectCategory,
} from "./index";
import type { Category } from "./index";
import { LANGUAGE_RULES as LANGUAGE_GUIDANCE } from "./language";
import { pickRandomLayout } from "./theme-selection";

/**
 * Builds the system prompt instruction for age-restricted websites.
 * Tells the AI to include a full-screen 18+ age verification gate
 * before any content is visible. Language-aware.
 */
function buildAgeRestrictionInstruction(contentLanguage: AppLanguage): string {
  const labels: Record<AppLanguage, { title: string; message: string; button: string; warning: string }> = {
    en: {
      title: "Age Verification Required",
      message: "You must be at least 18 years old to access this website. By entering, you confirm that you meet the legal age requirement and accept full responsibility.",
      button: "I am 18 or older — Enter",
      warning: "18+",
    },
    ar: {
      title: "التحقق من العمر مطلوب",
      message: "يجب أن يكون عمرك 18 عامًا على الأقل للوصول إلى هذا الموقع. بدخولك، تؤكد أنك تستوفي متطلبات السن القانونية وتتحمل المسؤولية الكاملة.",
      button: "عمري 18 سنة أو أكثر — دخول",
      warning: "+18",
    },
    ku: {
      title: "پشتڕاستکردنەوەی تەمەن پێویستە",
      message: "دەبێت لانیکەم ١٨ ساڵ تەمەنت بێت بۆ چوونەژوورەوەی ئەم وێبسایتە. بە چوونەژوورەوە، پشتڕاست دەکەیتەوە کە مەرجی تەمەنی یاسایی بەجێ دەهێنیت و تەواوی بەرپرسیارێتی قبوڵ دەکەیت.",
      button: "تەمەنم ١٨ ساڵ یان زیاترە — بچۆ ژوورەوە",
      warning: "+١٨",
    },
  };

  const l = labels[contentLanguage] ?? labels.en;
  const dir = contentLanguage === "ar" || contentLanguage === "ku" ? "rtl" : "ltr";

  return `
AGE-RESTRICTED CONTENT — MANDATORY 18+ GATE (NON-NEGOTIABLE):
This website contains age-restricted content. You MUST include a full-screen age verification overlay as the FIRST visible element.

Requirements:
- A fixed, full-screen overlay (id="age-gate") covering the entire page with a dark semi-transparent backdrop.
- Centered card with the title "${l.title}", the message "${l.message}", and a styled button "${l.button}".
- A prominent "${l.warning}" badge/icon in the overlay.
- The overlay must use dir="${dir}" for proper text direction.
- On button click, hide the overlay and show the website content. Use simple JS: document.getElementById('age-gate').style.display='none'.
- The website body content should have overflow:hidden while the gate is visible.
- Style the gate to match the website theme (colors, fonts, border-radius).
- Do NOT skip this gate under any circumstances.
`.trim();
}

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

function buildLayoutInstruction(layout: string): string {
  const layoutDesc =
    LAYOUT_DESCRIPTIONS[layout] ??
    "Follow the selected layout style consistently across all sections.";
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
- You MUST still deliver split heroes, editorial grids, asymmetric sections, dramatic typography, and full creative ambition.
- Mirror flex/grid direction and navigation order for RTL; keep the same section geometry and visual drama as a premium English site.
- For Arabic/Kurdish copy, use confident display typography (scale + weight contrast). Do not reduce the whole page to uniform small body text.
- Team/profile photos: set data-image-query to the depicted role (e.g. "professional lawyer portrait office") — never unrelated stock subjects.
`.trim()
    : "";

  return [
    "PREMIUM OUTPUT BAR (NON-NEGOTIABLE):",
    "- Aim for top-tier portfolio / editorial / high-end marketing quality — never a default landing-page cliché.",
    "- One strong hero moment, clear hierarchy, intentional whitespace, polished buttons and form fields, subtle motion (scroll reveal, hover states).",
    "- When the user does not specify colors or art direction, still ship premium work: use your creative judgment and the DESIGN SYSTEM button/input minimums.",
    "- Forbidden as the entire desktop experience: repeated full-width bands with identical 3-column card grids only.",
    "- Write all CSS inline in a single <style> tag. Do not reference external CSS files.",
    rtlBlock,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildCreativeDesignBrief(category: string, layout: string): string {
  const layoutInstruction = buildLayoutInstruction(layout);

  return `
═══════════════════════════════════════════
CREATIVE DESIGN BRIEF — READ BEFORE WRITING ANY HTML
═══════════════════════════════════════════
CATEGORY: ${category}
LAYOUT STYLE: ${layout}

CREATIVE FREEDOM — DESIGN YOUR OWN THEME:
You have FULL creative freedom to design the visual style.
There is NO pre-made theme or external CSS file to follow.
Write ALL CSS yourself inside a single <style> tag in <head>.

YOUR DESIGN RESPONSIBILITIES:
1. COLOR PALETTE: Choose a unique, harmonious color palette 
   (3-5 colors) that fits the "${category}" category and feels premium.
   - Define all colors as CSS custom properties in :root {}
   - Use these variable names: --bg, --surface, --primary, 
     --secondary, --text, --muted, --border
   - Ensure sufficient contrast for accessibility

2. TYPOGRAPHY: Pick a complementary Google Fonts pairing 
   (one display/heading font + one body font).
   - Load via @import url('...') at the top of <style>
   - Define as: --font-heading and --font-body in :root {}
   - Hero heading: 3rem–4rem, weight 700
   - Section heading: 2rem–2.5rem, weight 700
   - Body: 1rem, weight 400, line-height 1.6

3. VISUAL DEPTH (MANDATORY):
   - Do NOT produce a flat plain-color site. Use layered visual depth.
   - Use at least 2 gradients derived from your chosen colors.
   - Apply one large atmospheric gradient (hero or page backdrop).
   - Apply one interactive gradient (buttons, badges, or callouts).
   - Add elevated surfaces: soft shadows + border + backdrop contrast.
   - Keep contrast and readability high; gradients must never hurt legibility.

4. ANIMATIONS:
   - Scroll fade-in with IntersectionObserver (data-scroll → .visible)
   - Hover effects on buttons, cards, and links
   - Smooth transitions (0.3s ease) on all interactive elements

CSS CLASS CONVENTIONS (use these for structure):
  nav, .logo, nav ul, nav ul a
  .hero, .hero h1, .hero p
  .btn, .btn-primary
  section, .section-title
  .card, .card h3, .grid-3
  footer
  [data-scroll], .visible
Also define in :root {}: --radius: 8px; --transition: 0.3s ease;

${layoutInstruction}
═══════════════════════════════════════════
Be original and creative. Every website should feel unique.
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
- Use intent "edit" when the user asks to change, translate, fix, tweak, update, adjust, add, or remove something on the site, or to modify text, colors, layout, or CSS.
- Use intent "redesign" when the user wants a completely new look, different theme, new design, or expresses dislike of the current design. Keywords: redesign, new look, different style, redo, make it look different, I don't like it, change the design, new theme, different design, start over with the design.
- Use "build" only when they clearly want a brand-new website about a different topic or to discard the current site entirely.
- Use "chat" for greetings, questions, or conversation that does not imply changing the site.`
    : "";

  const system = `
You are an intent and language classifier.
Return ONLY raw JSON. No markdown. No explanation.

Intent values:
- "build" — user wants a new website (no existing site, or wants a completely different topic)
- "edit" — user wants to change specific parts of an existing website (add, remove, modify elements)
- "redesign" — user wants a completely new visual design/theme for the SAME website content
- "chat" — user is chatting, asking questions, or greeting

REDESIGN vs EDIT:
- "redesign" = user dislikes the overall look and wants a fresh visual style (new colors, fonts, layout, entirely new theme)
- "edit" = user wants specific changes (add a section, change a heading, fix colors, add animations, modify text)

REDESIGN keywords: redesign, redo, new look, new design, different theme, new theme, different style, I don't like it, ugly, change the whole design, make it look different, start over, try again, another design, completely different, change the theme, change the layout
EDIT keywords: add, remove, change, fix, update, translate, make it darker, make it light, add section, modify, tweak

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
  userImages?: PromptUserImage[],
  isAgeRestricted = false
): ChatMessage[] {
  const isRtl = contentLanguage === "ar" || contentLanguage === "ku";
  const latestUserMessage =
    history.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const category = detectCategory(latestUserMessage);
  const layout = pickRandomLayout(latestUserMessage);
  const currentYear = new Date().getFullYear();
  const designBrief = buildCreativeDesignBrief(category, layout);

  const populatedBuildMode = BUILD_MODE
    .replace("{GOOGLE_FONTS_URL}", "")
    .replace("{BODY_FONT}", "")
    .replace("{HEADING_FONT}", "")
    .replace("{USER_IMAGES_BLOCK}", buildUserImagesBlock(userImages));

  const websiteStructureForYear = WEBSITE_STRUCTURE.replaceAll(
    "{CURRENT_SITE_YEAR}",
    String(currentYear)
  );

  const systemParts = [
    PERSONALITY,
    `CURRENT_SITE_YEAR (authoritative footer copyright year): ${currentYear}`,
    designBrief,
    buildPremiumOutputBar(isRtl),
    LANGUAGE_GUIDANCE,
    populatedBuildMode,
    DESIGN_SYSTEM,
    MOBILE_RULES,
    IMAGE_RULES,
    isRtl ? RTL_RULES : "",
    websiteStructureForYear,
    `Website content language: ${contentLanguage}`,
    `Conversation reply language: ${detectedUserLanguage}`,
    OUTPUT_FORMAT,
    isAgeRestricted ? buildAgeRestrictionInstruction(contentLanguage) : "",
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
  userImages?: PromptUserImage[],
  isAgeRestricted = false
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
    IMAGE_RULES,
    isRtl ? RTL_RULES : "",
    `Website content language: ${contentLanguage}`,
    `Conversation reply language: ${detectedUserLanguage}`,
    `CURRENT HTML:\n${existingHtml}`,
    isAgeRestricted ? buildAgeRestrictionInstruction(contentLanguage) : "",
  ].filter(Boolean);

  const system = systemParts.join("\n\n");

  return [
    { role: "system", content: system },
    ...mapHistoryToChatMessages(history),
  ];
}

/**
 * Builds system and history messages for a full redesign of an existing website.
 * Keeps business content but instructs the AI to create a completely new visual design.
 */
export function buildRedesignMessages(
  history: HistoryMessage[],
  existingHtml: string,
  contentLanguage: AppLanguage,
  detectedUserLanguage: AppLanguage,
  userImages?: PromptUserImage[],
  isAgeRestricted = false
): ChatMessage[] {
  const isRtl = contentLanguage === "ar" || contentLanguage === "ku";
  const category = detectCategory(
    history.filter((m) => m.role === "user").at(-1)?.content ?? ""
  );
  const layout = pickRandomLayout(
    history.filter((m) => m.role === "user").at(-1)?.content ?? ""
  );
  const currentYear = new Date().getFullYear();
  const designBrief = buildCreativeDesignBrief(category, layout);
  const redesignModeWithImages = REDESIGN_MODE.replace(
    "{USER_IMAGES_BLOCK}",
    buildUserImagesBlock(userImages)
  );

  const systemParts = [
    PERSONALITY,
    `CURRENT_SITE_YEAR (authoritative footer copyright year): ${currentYear}`,
    redesignModeWithImages,
    designBrief,
    buildPremiumOutputBar(isRtl),
    LANGUAGE_GUIDANCE,
    DESIGN_SYSTEM,
    MOBILE_RULES,
    IMAGE_RULES,
    isRtl ? RTL_RULES : "",
    `Website content language: ${contentLanguage}`,
    `Conversation reply language: ${detectedUserLanguage}`,
    `CURRENT HTML (keep the business content, redesign the visuals):\n${existingHtml}`,
    isAgeRestricted ? buildAgeRestrictionInstruction(contentLanguage) : "",
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
  detectedUserLanguage: AppLanguage,
  existingHtml?: string | null
): ChatMessage[] {
  const systemParts = [
    PERSONALITY,
    LANGUAGE_GUIDANCE,
    APP_KNOWLEDGE,
    CHAT_MODE,
    OUTPUT_FORMAT,
    `Conversation reply language: ${detectedUserLanguage}`,
  ];

  if (existingHtml && existingHtml.trim().length > 0) {
    systemParts.push(
      `CURRENT WEBSITE HTML (this is the live version the user sees — answer questions based on this, not on earlier chat history):\n${existingHtml}`
    );
  }

  const system = systemParts.join("\n\n");

  return [
    { role: "system", content: system },
    ...mapHistoryToChatMessages(history),
  ];
}
