import { HistoryMessage } from "@/shared/types/database";

export type SendChatMessageResponse = {
  userMessage: HistoryMessage;
  assistantMessage: HistoryMessage;
  messages: HistoryMessage[];
  html?: string | null;
};

/** Sends a chat message through the API and returns the latest conversation state. */
export async function sendChatMessage(
  chatId: string,
  content: string
): Promise<SendChatMessageResponse> {
  const response = await fetch("/api/chat/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, content }),
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
    throw new Error(message);
  }

  return data as unknown as SendChatMessageResponse;
}
