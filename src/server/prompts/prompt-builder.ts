import { HistoryMessage } from "@/shared/types/database";
import { AI_CONFIG } from "@/shared/constants/ai";
import { SYSTEM_PROMPT } from "./system-prompt";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function buildMessages(
  history: HistoryMessage[],
  language: "en" | "ar" | "ku" = "en",
  existingHtml: string | null = null
): ChatMessage[] {
  const languageLabel =
    language === "ar" ? "Arabic" : language === "ku" ? "Kurdish Sorani" : "English";

  const systemMessage: ChatMessage = {
    role: "system",
    content: `${SYSTEM_PROMPT}\n\nThe user's preferred website language is: ${languageLabel} (${language}). Generate website content in this language unless the user specifies otherwise.`,
  };

  const trimmed = history.slice(-AI_CONFIG.MAX_HISTORY_TURNS);

  const conversationMessages: ChatMessage[] = trimmed.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  const isEditMode = typeof existingHtml === "string" && existingHtml.trim().length > 0;

  const modeSignal: ChatMessage = {
    role: "system",
    content: isEditMode
      ? `EDIT MODE: A website already exists in the user's preview. The current HTML is:\n\n${existingHtml}\n\nMake ONLY the specific change the user is requesting. Preserve ALL existing CSS variables, layout, structure, fonts, sections. Return the complete updated HTML with surgical edits only. Never regenerate from scratch.`
      : "GENERATION MODE: No website exists yet. Generate a complete, beautiful website from scratch based on the user's description. Pick a color scheme that fits the business type — do NOT default to purple/indigo every time.",
  };

  const lastUserIdx = conversationMessages.findLastIndex((m) => m.role === "user");
  if (lastUserIdx >= 0) {
    conversationMessages.splice(lastUserIdx, 0, modeSignal);
  }

  return [systemMessage, ...conversationMessages];
}
