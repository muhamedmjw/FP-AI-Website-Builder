import { HistoryMessage } from "@/shared/types/database";

const PENDING_GUEST_CHAT_KEY = "pending_guest_chat_session";

type PendingGuestMessage = {
  role: "user" | "assistant";
  content: string;
};

type PendingGuestChatSession = {
  title: string;
  messages: PendingGuestMessage[];
  createdAt: string;
};

function buildChatTitle(messages: PendingGuestMessage[]): string {
  const firstUserPrompt = messages.find((message) => message.role === "user");
  if (!firstUserPrompt) {
    return "Guest Chat";
  }

  const compact = firstUserPrompt.content.trim().replace(/\s+/g, " ");
  if (compact.length <= 40) {
    return compact;
  }

  return compact.slice(0, 40).trimEnd() + "...";
}

export function savePendingGuestChatSession(messages: HistoryMessage[]) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedMessages = messages
    .filter(
      (message): message is HistoryMessage & { role: "user" | "assistant" } =>
        message.role === "user" || message.role === "assistant"
    )
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0);

  if (normalizedMessages.length === 0) {
    return;
  }

  const payload: PendingGuestChatSession = {
    title: buildChatTitle(normalizedMessages),
    messages: normalizedMessages,
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(PENDING_GUEST_CHAT_KEY, JSON.stringify(payload));
}

export function readPendingGuestChatSession(): PendingGuestChatSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(PENDING_GUEST_CHAT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PendingGuestChatSession;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.title !== "string" ||
      !Array.isArray(parsed.messages)
    ) {
      return null;
    }

    const validMessages = parsed.messages.filter((message) => {
      return (
        message &&
        typeof message === "object" &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0
      );
    });

    if (validMessages.length === 0) {
      return null;
    }

    return {
      title: parsed.title.trim() || "Guest Chat",
      messages: validMessages,
      createdAt:
        typeof parsed.createdAt === "string"
          ? parsed.createdAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function consumePendingGuestChatSession(): PendingGuestChatSession | null {
  const pendingSession = readPendingGuestChatSession();
  if (!pendingSession) {
    return null;
  }

  clearPendingGuestChatSession();
  return pendingSession;
}

export function clearPendingGuestChatSession() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(PENDING_GUEST_CHAT_KEY);
}
