import { AI_CONFIG } from "@/shared/constants/ai";
import { AppLanguage, HistoryMessage } from "@/shared/types/database";
import { BASE_CSS } from "./base-css";
import { APP_KNOWLEDGE, SYSTEM_PROMPT } from "./system-prompt";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function mapHistoryToChatMessages(history: HistoryMessage[]): ChatMessage[] {
  return history
    .slice(-AI_CONFIG.MAX_HISTORY_TURNS)
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
}

export function buildClassifierMessages(userMessage: string): ChatMessage[] {
  const systemPrompt = `
You are an intent classifier.

Return ONLY raw JSON.
No markdown.
No explanation.

Intent values:
- "build" -> user wants a new website built
- "edit" -> user wants changes to an existing website
- "chat" -> user is asking a question, greeting, discussing the app, or talking without asking for a website build/edit

Language values:
- "en"
- "ar"
- "ku"

Important rules:
- If the user is describing a website they want, classify as "build"
- If the user wants to change an existing website, classify as "edit"
- If the user is asking about code, files, behavior, setup, export, model, or project structure, classify as "chat"
- If the message is vague but still asks for a website, classify as "build"
- If the message is only conversational, classify as "chat"

Return exactly this shape:
{"intent":"build","detectedLanguage":"en"}
`.trim();

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];
}


export function buildGenerationMessages(
  history: HistoryMessage[],
  websiteLanguage: AppLanguage,
  detectedUserLanguage: AppLanguage
): ChatMessage[] {
  const systemMessage = `
${SYSTEM_PROMPT}

Website content language: ${websiteLanguage}
Conversation reply language: ${detectedUserLanguage}
`.trim();

  const modeSignal = `
BUILD MODE:
- If the request is specific enough, generate the website now
- If critical design details are missing, ask a few short clarifying questions first
- Ask about the most important missing preferences such as colors, style, sections, layout, and special features
- Do not ask too many questions if the request is already clear
- If generating, return type "website"
- If asking questions first, return type "questions"
`.trim();

  return [
    { role: "system", content: `${systemMessage}\n\n${modeSignal}` },
    ...mapHistoryToChatMessages(history),
  ];
}


export function buildEditMessages(
  history: HistoryMessage[],
  existingHtml: string,
  websiteLanguage: AppLanguage,
  detectedUserLanguage: AppLanguage
): ChatMessage[] {
  const systemMessage = `
${SYSTEM_PROMPT}

Website content language: ${websiteLanguage}
Conversation reply language: ${detectedUserLanguage}
`.trim();

  const modeSignal = `
EDIT MODE:
- The current website HTML is provided below
- Perform a surgical edit only
- Preserve all unrelated code, structure, styling, and content
- Do not redesign the whole website unless the user explicitly asks for a redesign
- If the requested edit is unclear, ask a short clarifying question first
- Return the complete updated HTML if editing is possible

CURRENT HTML:
${existingHtml}
`.trim();

  return [
    { role: "system", content: `${systemMessage}\n\n${modeSignal}` },
    ...mapHistoryToChatMessages(history),
  ];
}


export function buildChatMessages(
  history: HistoryMessage[],
  detectedUserLanguage: AppLanguage
): ChatMessage[] {
  const systemPrompt = `
You are a helpful assistant inside an AI website builder app.

Always return raw JSON only:
{"type":"questions","message":"your reply"}

Reply in the same language as the user.

App info:
${APP_KNOWLEDGE}
`.trim();

  return [
    { role: "system", content: systemPrompt },
    ...mapHistoryToChatMessages(history),
  ];
}
