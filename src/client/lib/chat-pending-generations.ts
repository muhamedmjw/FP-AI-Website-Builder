const STORAGE_KEY = "chat-pending-generations-v1";
const CHANGE_EVENT = "chat-pending-generations:change";
const MAX_PENDING_AGE_MS = 2 * 60 * 60 * 1000;

type PendingGenerationPayload = {
  startedAt: number;
  baselineAssistantCreatedAt: string | null;
};

type PendingGenerationMap = Record<string, PendingGenerationPayload>;
let pendingGenerationMapCache: PendingGenerationMap | null = null;

function isBrowser() {
  return typeof window !== "undefined";
}

function pruneExpired(map: PendingGenerationMap, nowMs = Date.now()): PendingGenerationMap {
  return Object.entries(map).reduce<PendingGenerationMap>((acc, [chatId, payload]) => {
    if (Number.isFinite(payload.startedAt) && nowMs - payload.startedAt <= MAX_PENDING_AGE_MS) {
      acc[chatId] = payload;
    }

    return acc;
  }, {});
}

function parseStoredMap(raw: string | null): PendingGenerationMap {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const normalizedEntries = Object.entries(parsed).flatMap(([chatId, value]) => {
      if (!chatId || typeof chatId !== "string") {
        return [];
      }

      const startedAt =
        value && typeof value === "object" && "startedAt" in value
          ? Number((value as { startedAt?: unknown }).startedAt)
          : NaN;

      const baselineAssistantCreatedAt =
        value &&
        typeof value === "object" &&
        "baselineAssistantCreatedAt" in value &&
        typeof (value as { baselineAssistantCreatedAt?: unknown })
          .baselineAssistantCreatedAt === "string"
          ? (value as { baselineAssistantCreatedAt: string })
              .baselineAssistantCreatedAt
          : null;

      if (!Number.isFinite(startedAt)) {
        return [];
      }

      return [[chatId, { startedAt, baselineAssistantCreatedAt }]];
    });

    return Object.fromEntries(normalizedEntries);
  } catch {
    return {};
  }
}

function emitChange() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function readMapFromStorage(): PendingGenerationMap {
  if (!isBrowser()) {
    return {};
  }

  if (pendingGenerationMapCache) {
    return pendingGenerationMapCache;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = parseStoredMap(raw);
  const pruned = pruneExpired(parsed);

  const parsedCount = Object.keys(parsed).length;
  const prunedCount = Object.keys(pruned).length;

  if (parsedCount !== prunedCount) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  }

  pendingGenerationMapCache = pruned;

  return pruned;
}

function writeMapToStorage(map: PendingGenerationMap) {
  if (!isBrowser()) {
    return;
  }

  const nextMap = pruneExpired(map);
  pendingGenerationMapCache = nextMap;

  if (Object.keys(nextMap).length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMap));
  }

  emitChange();
}

export function markChatGenerationPending(
  chatId: string,
  startedAt = Date.now(),
  baselineAssistantCreatedAt: string | null = null
) {
  if (!isBrowser() || !chatId) {
    return;
  }

  const currentMap = readMapFromStorage();
  const currentEntry = currentMap[chatId];
  const nextStartedAt =
    currentEntry && Number.isFinite(currentEntry.startedAt)
      ? Math.min(currentEntry.startedAt, startedAt)
      : startedAt;

  const nextBaselineAssistantCreatedAt =
    baselineAssistantCreatedAt ?? currentEntry?.baselineAssistantCreatedAt ?? null;

  writeMapToStorage({
    ...currentMap,
    [chatId]: {
      startedAt: nextStartedAt,
      baselineAssistantCreatedAt: nextBaselineAssistantCreatedAt,
    },
  });
}

export function resolveChatGeneration(chatId: string) {
  if (!isBrowser() || !chatId) {
    return;
  }

  const currentMap = readMapFromStorage();

  if (!(chatId in currentMap)) {
    return;
  }

  const { [chatId]: _removed, ...rest } = currentMap;
  void _removed;
  writeMapToStorage(rest);
}

export function getPendingChatGeneration(chatId: string): PendingGenerationPayload | null {
  if (!chatId) {
    return null;
  }

  const currentMap = readMapFromStorage();
  return currentMap[chatId] ?? null;
}

export function getPendingChatGenerations(): Array<
  PendingGenerationPayload & { chatId: string }
> {
  return Object.entries(readMapFromStorage()).map(([chatId, payload]) => ({
    chatId,
    ...payload,
  }));
}

export function getPendingChatIds(): string[] {
  return Object.keys(readMapFromStorage());
}

export function subscribePendingChatGenerations(onChange: () => void): () => void {
  if (!isBrowser()) {
    return () => {};
  }

  const handleChange = () => {
    onChange();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      pendingGenerationMapCache = null;
      onChange();
    }
  };

  window.addEventListener(CHANGE_EVENT, handleChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT, handleChange);
    window.removeEventListener("storage", handleStorage);
  };
}
