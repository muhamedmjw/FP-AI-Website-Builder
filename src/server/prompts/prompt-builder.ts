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
    content: `${SYSTEM_PROMPT}\n\nWEBSITE CONTENT LANGUAGE: Generate all text INSIDE the website HTML (headings, paragraphs, nav links, buttons, etc.) in: ${languageLabel} (${language}).\n\nCONVERSATION LANGUAGE: This is completely separate. Always detect the language the user is writing in and reply in THAT language. If the user writes in Kurdish Sorani, reply in Kurdish Sorani. If the user writes in Arabic, reply in Arabic. If the user writes in English, reply in English. Never mix these two concepts up.`,
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
      ? `STRICT EDIT MODE - READ THIS CAREFULLY:
A website already exists. The current complete HTML is provided below.

YOUR ONLY JOB: Make the ONE specific change the user just asked for.

STRICT RULES YOU MUST FOLLOW:
- Copy the existing HTML exactly as your starting point
- Change ONLY what the user explicitly asked for
- Do NOT change colors unless asked
- Do NOT change fonts unless asked
- Do NOT change layout unless asked
- Do NOT add new sections unless asked
- Do NOT remove existing sections unless asked
- Do NOT rename the business unless asked
- Do NOT redesign anything unless asked
- Preserve ALL existing CSS variables, class names, and structure
- Return the COMPLETE updated HTML file with only the surgical edit applied

If you regenerate or redesign anything not asked about, that is a FAILURE.

CURRENT HTML:
${existingHtml}`
      : "GENERATION MODE: No website exists yet. Generate a complete, beautiful website from scratch based on the user's description. Pick a color scheme that fits the business type — do NOT default to purple/indigo every time.",
  };

  const lastUserIdx = conversationMessages.findLastIndex((m) => m.role === "user");
  if (lastUserIdx >= 0) {
    conversationMessages.splice(lastUserIdx, 0, modeSignal);
  }

  return [systemMessage, ...conversationMessages];
}
