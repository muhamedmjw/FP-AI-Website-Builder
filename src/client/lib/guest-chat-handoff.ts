import { HistoryMessage } from "@/shared/types/database";

/**
 * GUEST STATE ARCHITECTURE NOTE
 *
 * Guest state is currently split across three systems:
 * 1. localStorage key "pending_guest_chat_session" (this file) — stores messages + HTML
 *    for handoff when a guest signs up.
 * 2. localStorage key "guest_mode_session_v1" (guest-home.tsx) — stores the active
 *    guest session during the chat itself.
 * 3. Cookie "guest_token" + database table "guest_usage" — tracks rate limit identity.
 *
 * These two localStorage keys serve different purposes and should not be merged
 * without careful testing of the sign-up handoff flow.
 *
 * Future improvement: consolidate guest session state into a single localStorage
 * key with a clear schema, and derive the handoff payload from it at sign-up time.
 */
export const GUEST_HANDOFF_STORAGE_KEY = "pending_guest_chat_session";
// guest-home.tsx uses a separate key intentionally — see architecture note above
const IMPORTED_GUEST_CHAT_MAP_KEY = "imported_guest_chat_map_v1";
const MAX_IMPORTED_GUEST_CHAT_ENTRIES = 50;

type PendingGuestMessage = {
  role: "user" | "assistant";
  content: string;
};

type PendingGuestChatSession = {
  sessionId: string;
  title: string;
  messages: PendingGuestMessage[];
  html: string | null;
  websiteGenerated: boolean;
  createdAt: string;
};

type SavePendingGuestChatSessionOptions = {
  sessionId?: string;
  html?: string | null;
  websiteGenerated?: boolean;
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

function normalizePendingHtml(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? value : null;
}

function buildSessionId(messages: PendingGuestMessage[], html: string | null): string {
  const seed = JSON.stringify({ messages, html: html ?? "" });
  let hash = 5381;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 33) ^ seed.charCodeAt(index);
  }

  return `guest-${(hash >>> 0).toString(36)}`;
}

function readImportedGuestChatMap(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = localStorage.getItem(IMPORTED_GUEST_CHAT_MAP_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const entries = Object.entries(parsed as Record<string, unknown>).filter(
      ([sessionId, chatId]) =>
        typeof sessionId === "string" &&
        sessionId.trim().length > 0 &&
        typeof chatId === "string" &&
        chatId.trim().length > 0
    );

    return entries.reduce<Record<string, string>>((map, [sessionId, chatId]) => {
      map[sessionId] = chatId as string;
      return map;
    }, {});
  } catch {
    return {};
  }
}

function writeImportedGuestChatMap(map: Record<string, string>) {
  if (typeof window === "undefined") {
    return;
  }

  const entries = Object.entries(map);
  const boundedEntries =
    entries.length > MAX_IMPORTED_GUEST_CHAT_ENTRIES
      ? entries.slice(entries.length - MAX_IMPORTED_GUEST_CHAT_ENTRIES)
      : entries;

  localStorage.setItem(
    IMPORTED_GUEST_CHAT_MAP_KEY,
    JSON.stringify(Object.fromEntries(boundedEntries))
  );
}

export function savePendingGuestChatSession(
  messages: HistoryMessage[],
  options: SavePendingGuestChatSessionOptions = {}
) {
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

  const html = normalizePendingHtml(options.html);
  const providedSessionId =
    typeof options.sessionId === "string" && options.sessionId.trim().length > 0
      ? options.sessionId.trim()
      : null;
  const websiteGenerated =
    typeof options.websiteGenerated === "boolean"
      ? options.websiteGenerated
      : html !== null;
  const sessionId = providedSessionId ?? buildSessionId(normalizedMessages, html);

  const payload: PendingGuestChatSession = {
    sessionId,
    title: buildChatTitle(normalizedMessages),
    messages: normalizedMessages,
    html,
    websiteGenerated,
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(GUEST_HANDOFF_STORAGE_KEY, JSON.stringify(payload));
}

export function readPendingGuestChatSession(): PendingGuestChatSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(GUEST_HANDOFF_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PendingGuestChatSession;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.messages)) {
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

    const html = normalizePendingHtml((parsed as { html?: unknown }).html);
    const websiteGeneratedValue = (parsed as { websiteGenerated?: unknown }).websiteGenerated;
    const websiteGenerated =
      typeof websiteGeneratedValue === "boolean"
        ? websiteGeneratedValue
        : html !== null;
    const parsedSessionId = (parsed as { sessionId?: unknown }).sessionId;
    const sessionId =
      typeof parsedSessionId === "string" && parsedSessionId.trim().length > 0
        ? parsedSessionId
        : buildSessionId(validMessages, html);
    const parsedTitle = (parsed as { title?: unknown }).title;
    const safeTitle =
      typeof parsedTitle === "string" && parsedTitle.trim().length > 0
        ? parsedTitle.trim()
        : "Guest Chat";
    const parsedCreatedAt = (parsed as { createdAt?: unknown }).createdAt;

    return {
      sessionId,
      title: safeTitle,
      messages: validMessages,
      html,
      websiteGenerated,
      createdAt:
        typeof parsedCreatedAt === "string"
          ? parsedCreatedAt
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

  localStorage.removeItem(GUEST_HANDOFF_STORAGE_KEY);
}

export function getImportedGuestChatId(sessionId: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const normalizedSessionId = sessionId.trim();
  if (!normalizedSessionId) {
    return null;
  }

  const importedMap = readImportedGuestChatMap();
  const chatId = importedMap[normalizedSessionId];

  return typeof chatId === "string" && chatId.trim().length > 0 ? chatId : null;
}

export function markGuestChatSessionImported(sessionId: string, chatId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedSessionId = sessionId.trim();
  const normalizedChatId = chatId.trim();

  if (!normalizedSessionId || !normalizedChatId) {
    return;
  }

  const importedMap = readImportedGuestChatMap();
  importedMap[normalizedSessionId] = normalizedChatId;
  writeImportedGuestChatMap(importedMap);
}
