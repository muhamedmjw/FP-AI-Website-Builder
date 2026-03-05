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

  return [systemMessage, ...conversationMessages];
}
