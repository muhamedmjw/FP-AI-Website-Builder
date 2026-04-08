import { AI_CONFIG } from "@/shared/constants/ai";
import { AppLanguage, HistoryMessage } from "@/shared/types/database";
import {
  PERSONALITY,
  LANGUAGE_RULES,
  OUTPUT_FORMAT,
  APP_KNOWLEDGE,
  THEMES,
  DESIGN_SYSTEM,
  MOBILE_RULES,
  RTL_RULES,
  IMAGE_RULES,
  WEBSITE_STRUCTURE,
  BUILD_MODE,
  EDIT_MODE,
  CHAT_MODE,
} from "./system-prompt";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type PromptUserImage = {
  fileName: string;
  dataUri: string;
};

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

  const maxTotalBytes = 1.5 * 1024 * 1024;
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
    totalBytes > maxTotalBytes ? userImages.slice(-3) : userImages;

  const pathLines = imagesForPrompt.map((image) => {
    return `${image.fileName} - user uploaded image (use for hero / gallery / product sections)`;
  });

  return [
    `User has uploaded ${imagesForPrompt.length} image(s). Use these EXACT src paths in your HTML img tags:`,
    ...pathLines.map((line) => `- ${line}`),
    "These paths work in the exported ZIP. For live preview the data URI is injected automatically.",
  ].join("\n");
}

export function buildClassifierMessages(
  userMessage: string,
  websiteLanguage: AppLanguage = "en"
): ChatMessage[] {
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
- websiteLanguage "ar" → detectedLanguage "ar"
- websiteLanguage "ku" → detectedLanguage "ku"
- websiteLanguage "en" + Arabic script → "ar"
Gibberish in Arabic script → still classify by script.

Return exactly:
{"intent":"build","detectedLanguage":"en"}
`.trim();

  return [
    { role: "system", content: system },
    { role: "user", content: userMessage },
  ];
}

export function buildGenerationMessages(
  history: HistoryMessage[],
  websiteLanguage: AppLanguage,
  detectedUserLanguage: AppLanguage,
  userImages?: PromptUserImage[]
): ChatMessage[] {
  const isRtl = websiteLanguage === "ar" || websiteLanguage === "ku";
  const buildModeWithImages = BUILD_MODE.replace(
    "{USER_IMAGES_BLOCK}",
    buildUserImagesBlock(userImages)
  );

  const system = [
    PERSONALITY,
    LANGUAGE_RULES,
    DESIGN_SYSTEM,
    MOBILE_RULES,
    IMAGE_RULES,
    THEMES,
    isRtl ? RTL_RULES : "",
    WEBSITE_STRUCTURE,
    buildModeWithImages,
    OUTPUT_FORMAT,
    `Website content language: ${websiteLanguage}`,
    `Conversation reply language: ${detectedUserLanguage}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return [
    { role: "system", content: system },
    ...mapHistoryToChatMessages(history),
  ];
}

export function buildEditMessages(
  history: HistoryMessage[],
  existingHtml: string,
  websiteLanguage: AppLanguage,
  detectedUserLanguage: AppLanguage,
  userImages?: PromptUserImage[]
): ChatMessage[] {
  const isRtl = websiteLanguage === "ar" || websiteLanguage === "ku";
  const editModeWithImages = EDIT_MODE.replace(
    "{USER_IMAGES_BLOCK}",
    buildUserImagesBlock(userImages)
  );

  const system = [
    PERSONALITY,
    LANGUAGE_RULES,
    editModeWithImages,
    DESIGN_SYSTEM,
    MOBILE_RULES,
    IMAGE_RULES,
    isRtl ? RTL_RULES : "",
    OUTPUT_FORMAT,
    `Website content language: ${websiteLanguage}`,
    `Conversation reply language: ${detectedUserLanguage}`,
    `CURRENT HTML:\n${existingHtml}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return [
    { role: "system", content: system },
    ...mapHistoryToChatMessages(history),
  ];
}

export function buildChatMessages(
  history: HistoryMessage[],
  detectedUserLanguage: AppLanguage
): ChatMessage[] {
  const system = [
    PERSONALITY,
    LANGUAGE_RULES,
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
