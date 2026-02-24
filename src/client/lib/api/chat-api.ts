import { HistoryMessage } from "@/shared/types/database";

export type SendChatMessageResponse = {
  userMessage: HistoryMessage;
  assistantMessage: HistoryMessage;
  messages: HistoryMessage[];
  html?: string | null;
};

async function tryReadJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

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

  const data = await tryReadJson(response);

  if (!response.ok) {
    const errorMessage =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : "Failed to send message.";

    throw new Error(errorMessage);
  }

  return data as SendChatMessageResponse;
}
