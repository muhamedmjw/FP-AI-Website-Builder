/**
 * Prompt Builder — constructs the messages array sent to the AI API.
 *
 * Takes: conversation history from DB + current user message + language
 * Returns: OpenAI-compatible messages array (used by Groq)
 */

import { HistoryMessage } from "@/shared/types/database";
import { AI_CONFIG } from "@/shared/constants/ai";
import { SYSTEM_PROMPT } from "./system-prompt";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Build the OpenAI-compatible messages array for the Groq API.
 *
 * - Prepends the system prompt with language context
 * - Converts DB history messages to { role, content } format
 * - Trims to MAX_HISTORY_TURNS to stay within context limits
 */
export function buildMessages(
  history: HistoryMessage[],
  language: "en" | "ar" | "ku" = "en"
): ChatMessage[] {
  const languageLabel =
    language === "ar" ? "Arabic" : language === "ku" ? "Kurdish Sorani" : "English";

  const systemMessage: ChatMessage = {
    role: "system",
    content: `${SYSTEM_PROMPT}\n\nThe user's preferred website language is: ${languageLabel} (${language}). Generate website content in this language unless the user specifies otherwise.`,
  };

  // Trim history to the most recent N messages
  const trimmed = history.slice(-AI_CONFIG.MAX_HISTORY_TURNS);

  const conversationMessages: ChatMessage[] = trimmed.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  // Detect whether a website was previously generated
  const hasExistingHtml = trimmed.some(
    (msg) => msg.role === "assistant" && msg.content.includes("<!DOCTYPE html>")
  );

  const modeSignal: ChatMessage = {
    role: "system",
    content: hasExistingHtml
      ? "CURRENT WEBSITE STATE: The website HTML from your last response is already loaded in the user's preview. You are now in EDIT MODE. Make ONLY the specific change the user is requesting. Preserve all existing CSS, layout, structure, and design. Return the complete updated HTML file with surgical edits only."
      : "GENERATION MODE: No website exists yet. Generate a complete, beautiful website from scratch based on the user's description.",
  };

  // Insert the mode signal right before the last user message
  const lastUserIdx = conversationMessages.findLastIndex(
    (m) => m.role === "user"
  );

  if (lastUserIdx >= 0) {
    conversationMessages.splice(lastUserIdx, 0, modeSignal);
  }

  return [systemMessage, ...conversationMessages];
}
