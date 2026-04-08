import { HistoryMessage } from "@/shared/types/database";
import type { AppLanguage } from "@/shared/types/database";

export class ChatApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ChatApiError";
    this.status = status;
  }
}

export type SendChatMessageResponse = {
  userMessage: HistoryMessage;
  assistantMessage: HistoryMessage;
  messages: HistoryMessage[];
  html?: string | null;
};

/** Sends a chat message through the API and returns the latest conversation state. */
export async function sendChatMessage(
  chatId: string,
  content: string,
  language: AppLanguage,
  options?: { skipUserMessageSave?: boolean; imageFileIds?: string[] }
): Promise<SendChatMessageResponse> {
  const response = await fetch("/api/chat/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chatId,
      content,
      language,
      skipUserMessageSave: options?.skipUserMessageSave === true,
      imageFileIds: Array.isArray(options?.imageFileIds)
        ? options?.imageFileIds
        : undefined,
    }),
  });

  let data: Record<string, unknown> | null = null;
  try {
    data = await response.json();
  } catch {
    // Response body is not JSON — handled below.
  }

  if (!response.ok) {
    const message =
      typeof data?.error === "string" ? data.error : "Failed to send message.";
    throw new ChatApiError(message, response.status);
  }

  return data as unknown as SendChatMessageResponse;
}
