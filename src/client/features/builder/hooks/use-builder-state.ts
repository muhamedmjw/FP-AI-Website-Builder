import { useCallback, useEffect, useRef, useState } from "react";
import { ChatApiError, sendChatMessage, abortGeneration } from "@/client/lib/api/chat-api";
import { registerClientAbort, abortClientGeneration, completeClientGeneration } from "@/client/lib/client-generation-abort";
import {
  getPendingChatGeneration,
  markChatGenerationPending,
  resolveChatGeneration,
  subscribePendingChatGenerations,
} from "@/client/lib/chat-pending-generations";
import { t } from "@/shared/constants/translations";
import type { AppLanguage, HistoryMessage, UserImage } from "@/shared/types/database";

const MESSAGE_IMAGE_IDS_STORAGE_PREFIX = "chat-message-image-file-ids:";

export type MessageAttachment = {
  fileId: string;
  fileName: string;
  dataUri: string;
  label: string;
};

type UseBuilderStateParams = {
  chatId: string;
  initialMessages: HistoryMessage[];
  isAuthenticated: boolean;
  language: AppLanguage;
  setInputErrorMessage: (message: string) => void;
  onApplyGeneratedHtml: (generatedHtml: string) => void;
};

type PreSendSnapshot = {
  messages: HistoryMessage[];
  messageImages: Record<string, MessageAttachment[]>;
  messageImageFileIds: Record<string, string[]>;
};

type OptimisticSendState = {
  outgoingImages: MessageAttachment[];
  tempUserMessage: HistoryMessage;
  latestAssistantCreatedAt: string | null;
};

function buildOutgoingImageAttachments(
  inputImages: UserImage[],
  language: AppLanguage
): MessageAttachment[] {
  return inputImages.map((image, index) => ({
    fileId: image.fileId,
    fileName: image.fileName,
    dataUri: image.dataUri,
    label: `${t("imageLabel", language)} ${index + 1}`,
  }));
}

function createOptimisticSendState(params: {
  chatId: string;
  content: string;
  language: AppLanguage;
  inputImages: UserImage[];
  messages: HistoryMessage[];
}): OptimisticSendState {
  const outgoingImages = buildOutgoingImageAttachments(
    params.inputImages,
    params.language
  );

  const tempUserMessage: HistoryMessage = {
    id: `temp-${Date.now()}`,
    chat_id: params.chatId,
    role: "user",
    content: params.content,
    created_at: new Date().toISOString(),
  };

  const latestAssistantCreatedAt =
    [...params.messages]
      .reverse()
      .find((message) => message.role === "assistant")
      ?.created_at ?? null;

  return {
    outgoingImages,
    tempUserMessage,
    latestAssistantCreatedAt,
  };
}

function buildFriendlySendErrorMessage(error: unknown): string {
  const status = error instanceof ChatApiError ? error.status : null;
  const rawMessage = error instanceof Error ? error.message : "";
  const normalizedRawMessage = rawMessage.toLowerCase();
  const isAbortLikeError =
    normalizedRawMessage.includes("abort") ||
    normalizedRawMessage.includes("aborted");

  if (
    status === 429 ||
    rawMessage.includes("429") ||
    rawMessage.includes("rate limit") ||
    rawMessage.includes("Rate limit")
  ) {
    return "\u23f3 Too many requests. Please wait a moment and try again.";
  }

  if (
    rawMessage.includes("token budget") ||
    rawMessage.includes("Daily token") ||
    rawMessage.includes("500,000")
  ) {
    return "\ud83d\udcc5 You've used your 500,000 daily token budget. Come back tomorrow!";
  }

  if (
    status === 401 ||
    rawMessage.includes("401") ||
    rawMessage.includes("Unauthorized")
  ) {
    return "\ud83d\udd12 Session expired. Please sign in again.";
  }

  if (
    status === 500 ||
    rawMessage.includes("500") ||
    rawMessage.includes("Internal")
  ) {
    return "\u26a0\ufe0f Something went wrong on our end. Please try again.";
  }

  if (
    normalizedRawMessage.includes("too large to process") ||
    normalizedRawMessage.includes("uploaded images")
  ) {
    return "\u26a0\ufe0f Images are too large to send together. Try removing some uploaded images and sending again.";
  }

  if (isAbortLikeError) {
    return "Connection interrupted. Checking if your AI reply finishes in the background...";
  }

  return "Failed to send message. Please try again.";
}

function getLatestMessageTimestamp(messages: HistoryMessage[]): number | null {
  let latestTimestamp: number | null = null;

  for (const message of messages) {
    const timestamp = Date.parse(message.created_at);
    if (!Number.isFinite(timestamp)) {
      continue;
    }

    latestTimestamp = latestTimestamp === null ? timestamp : Math.max(latestTimestamp, timestamp);
  }

  return latestTimestamp;
}

function shouldApplyServerMessages(
  currentMessages: HistoryMessage[],
  incomingMessages: HistoryMessage[]
): boolean {
  // If server has no messages, only apply when local is also empty.
  if (incomingMessages.length === 0) {
    return currentMessages.length === 0;
  }

  // An empty local list should always accept server state.
  if (currentMessages.length === 0) {
    return true;
  }

  const currentLatest = getLatestMessageTimestamp(currentMessages);
  const incomingLatest = getLatestMessageTimestamp(incomingMessages);

  // Prefer whichever side has the newer message timestamp.
  if (incomingLatest !== null && currentLatest !== null) {
    if (incomingLatest > currentLatest) {
      return true;
    }

    // Never overwrite newer local messages with older server snapshots.
    if (incomingLatest < currentLatest) {
      return false;
    }
  }

  // If timestamps tie or are unavailable, compare list lengths.
  if (incomingMessages.length > currentMessages.length) {
    return true;
  }

  if (incomingMessages.length < currentMessages.length) {
    return false;
  }

  const incomingLastMessageId = incomingMessages.at(-1)?.id;
  const currentLastMessageId = currentMessages.at(-1)?.id;

  // Final tie-breaker: different tail IDs means the states diverged.
  return incomingLastMessageId !== currentLastMessageId;
}

/**
 * Builder chat state machine:
 * 1) Optimistically append a user message and image attachments.
 * 2) Mark the generation as pending while request is in-flight.
 * 3) Reconcile with server messages on success.
 * 4) Roll back optimistic state on failure unless user intentionally stopped.
 */
export function useBuilderState({
  chatId,
  initialMessages,
  isAuthenticated,
  language,
  setInputErrorMessage,
  onApplyGeneratedHtml,
}: UseBuilderStateParams) {
  const currentInputImagesRef = useRef<UserImage[]>([]);
  const [messages, setMessages] = useState<HistoryMessage[]>(initialMessages);
  const [messageImages, setMessageImages] = useState<Record<string, MessageAttachment[]>>({});
  const [messageImageFileIds, setMessageImageFileIds] = useState<Record<string, string[]>>({});
  const [uploadedImageCatalog, setUploadedImageCatalog] = useState<Record<string, UserImage>>({});
  const [isRequestInFlight, setIsRequestInFlight] = useState(false);
  const [pendingGenerationStartedAt, setPendingGenerationStartedAt] = useState<number | null>(
    null
  );
  const previousChatIdRef = useRef(chatId);

  const isSending = isRequestInFlight || pendingGenerationStartedAt !== null;
  const hasOptimisticMessage = messages.some((message) => message.id.startsWith("temp-"));

  useEffect(() => {
    if (previousChatIdRef.current !== chatId) {
      previousChatIdRef.current = chatId;
      setMessages(initialMessages);
      return;
    }

    if (hasOptimisticMessage || isRequestInFlight) {
      return;
    }

    setMessages((currentMessages) => {
      if (!shouldApplyServerMessages(currentMessages, initialMessages)) {
        return currentMessages;
      }

      return initialMessages;
    });
  }, [chatId, hasOptimisticMessage, initialMessages, isRequestInFlight]);

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Reset hydration state on chat change
    setIsHydrated(false);
    currentInputImagesRef.current = [];
    setMessageImages({});

    try {
      const raw = window.localStorage.getItem(
        `${MESSAGE_IMAGE_IDS_STORAGE_PREFIX}${chatId}`
      );

      if (!raw) {
        setMessageImageFileIds({});
        setIsHydrated(true);
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const normalizedEntries = Object.entries(parsed).map(([messageId, value]) => {
        const ids = Array.isArray(value)
          ? value.filter((entry): entry is string => typeof entry === "string")
          : [];
        return [messageId, ids] as const;
      });

      setMessageImageFileIds(Object.fromEntries(normalizedEntries));
    } catch {
      setMessageImageFileIds({});
    } finally {
      setIsHydrated(true);
    }
  }, [chatId]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    try {
      if (Object.keys(messageImageFileIds).length === 0) {
        window.localStorage.removeItem(`${MESSAGE_IMAGE_IDS_STORAGE_PREFIX}${chatId}`);
      } else {
        window.localStorage.setItem(
          `${MESSAGE_IMAGE_IDS_STORAGE_PREFIX}${chatId}`,
          JSON.stringify(messageImageFileIds)
        );
      }
    } catch {
      // Ignore storage access failures.
    }
  }, [chatId, isHydrated, messageImageFileIds]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUploadedImageCatalog({});
      return;
    }

    const controller = new AbortController();
    let disposed = false;

    async function loadImageCatalog() {
      try {
        const response = await fetch(
          `/api/website/user-images?chatId=${encodeURIComponent(chatId)}`,
          {
            method: "GET",
            signal: controller.signal,
          }
        );

        const data = (await response.json().catch(() => null)) as
          | { images?: UserImage[] }
          | null;

        if (!response.ok || !data?.images || disposed) {
          return;
        }

        const nextCatalog = Object.fromEntries(
          data.images.map((image) => [image.fileId, image])
        );

        setUploadedImageCatalog(nextCatalog);
      } catch {
        if (!disposed) {
          setUploadedImageCatalog({});
        }
      }
    }

    void loadImageCatalog();

    return () => {
      disposed = true;
      controller.abort();
    };
  }, [chatId, isAuthenticated]);

  useEffect(() => {
    setMessageImages((currentImages) => {
      const entries = Object.entries(messageImageFileIds);
      if (entries.length === 0) {
        return {};
      }

      const nextMessageImages = entries.reduce<Record<string, MessageAttachment[]>>(
        (acc, [messageId, fileIds]) => {
          const attachments = fileIds
            .map((fileId, index) => {
              // 1. If we already have the fully constructed image in state (e.g. from an optimistic send), keep it!
              const existingAttachment = currentImages[messageId]?.find((a) => a.fileId === fileId);
              if (existingAttachment) {
                return existingAttachment;
              }

              // 2. Otherwise pull from the server catalog (useful for page reloads)
              const image = uploadedImageCatalog[fileId];
              if (!image) {
                return null;
              }

              return {
                fileId: image.fileId,
                fileName: image.fileName,
                dataUri: image.dataUri,
                label: `${t("imageLabel", language)} ${index + 1}`,
              } satisfies MessageAttachment;
            })
            .filter((value): value is MessageAttachment => Boolean(value));

          if (attachments.length > 0) {
            acc[messageId] = attachments;
          }

          return acc;
        },
        {}
      );

      // Simple shallow equality check to avoid infinite re-renders
      const isUnchanged =
        Object.keys(currentImages).length === Object.keys(nextMessageImages).length &&
        Object.keys(nextMessageImages).every(
          (key) => currentImages[key]?.length === nextMessageImages[key]?.length
        );

      return isUnchanged ? currentImages : nextMessageImages;
    });
  }, [language, messageImageFileIds, uploadedImageCatalog]);

  const syncPendingGenerationState = useCallback(() => {
    const pending = getPendingChatGeneration(chatId);
    setPendingGenerationStartedAt(pending?.startedAt ?? null);
  }, [chatId]);

  useEffect(() => {
    syncPendingGenerationState();
    return subscribePendingChatGenerations(syncPendingGenerationState);
  }, [syncPendingGenerationState]);

  // Track if the user intentionally stopped the generation
  const intentionallyStoppedRef = useRef(false);
  // AbortController for the active send fetch — lets us cancel it client-side instantly
  const sendAbortControllerRef = useRef<AbortController | null>(null);

  const handleSend = useCallback(async (content: string) => {
    // Reset the intentionally stopped flag at the start of a new send
    intentionallyStoppedRef.current = false;

    // Abort any previous in-flight send request before starting a new one
    if (sendAbortControllerRef.current) {
      sendAbortControllerRef.current.abort();
      sendAbortControllerRef.current = null;
    }

    const preSendSnapshot: PreSendSnapshot = {
      messages,
      messageImages,
      messageImageFileIds,
    };

    const { outgoingImages, tempUserMessage, latestAssistantCreatedAt } =
      createOptimisticSendState({
        chatId,
        content,
        language,
        inputImages: currentInputImagesRef.current,
        messages,
      });

    if (outgoingImages.length > 0) {
      setMessageImages((prev) => ({
        ...prev,
        [tempUserMessage.id]: outgoingImages,
      }));

      setMessageImageFileIds((prev) => ({
        ...prev,
        [tempUserMessage.id]: outgoingImages.map((image) => image.fileId),
      }));
    }

    setMessages((prev) => [...prev, tempUserMessage]);
    const startedAt = Date.now();
    markChatGenerationPending(chatId, startedAt, latestAssistantCreatedAt);
    setPendingGenerationStartedAt(startedAt);
    setIsRequestInFlight(true);
    setInputErrorMessage("");

    // Create a new AbortController for this request
    const abortController = new AbortController();
    sendAbortControllerRef.current = abortController;
    // Register in global registry so sidebar can abort it on chat deletion
    registerClientAbort(chatId, abortController);

    try {
      const data = await sendChatMessage(chatId, content, language, {
        imageFileIds: outgoingImages.map((image) => image.fileId),
        signal: abortController.signal,
      });

      setMessages(data.messages);

      if (outgoingImages.length > 0) {
        // React batches these updates in async handlers to keep message and attachments in sync.
        setMessageImages((prev) => {
          const next = { ...prev };
          delete next[tempUserMessage.id];
          next[data.userMessage.id] = outgoingImages;
          return next;
        });

        setMessageImageFileIds((prev) => {
          const next = { ...prev };
          const ids = next[tempUserMessage.id] ?? outgoingImages.map((image) => image.fileId);
          delete next[tempUserMessage.id];
          next[data.userMessage.id] = ids;
          return next;
        });
      }

      if (typeof data.html === "string") {
        onApplyGeneratedHtml(data.html);
      }

      resolveChatGeneration(chatId);
      setPendingGenerationStartedAt(null);
    } catch (error) {
      // Detect if this was an intentional abort (user clicked stop or new send started)
      const isAbortError =
        error instanceof DOMException && error.name === "AbortError";

      // If user intentionally stopped or fetch was aborted, don't show error
      if (intentionallyStoppedRef.current || isAbortError) {
        resolveChatGeneration(chatId);
        setPendingGenerationStartedAt(null);
        // Don't restore messages or show error - user chose to stop
        return;
      }

      // If the server responded with 499 (cancelled) or the error indicates cancellation, treat it silently
      const isCancellationError =
        (error instanceof ChatApiError && error.status === 499) ||
        (error instanceof Error &&
          (error.message.toLowerCase().includes("cancelled") ||
           error.message.toLowerCase().includes("aborted")));

      if (isCancellationError) {
        resolveChatGeneration(chatId);
        setPendingGenerationStartedAt(null);
        return;
      }

      resolveChatGeneration(chatId);
      setPendingGenerationStartedAt(null);

      setInputErrorMessage(buildFriendlySendErrorMessage(error));
      setMessages(preSendSnapshot.messages);
      setMessageImages(preSendSnapshot.messageImages);
      setMessageImageFileIds(preSendSnapshot.messageImageFileIds);
    } finally {
      // Only clear the ref if this controller is still the active one
      if (sendAbortControllerRef.current === abortController) {
        sendAbortControllerRef.current = null;
      }
      completeClientGeneration(chatId);
      setIsRequestInFlight(false);
    }
  }, [
    chatId,
    language,
    messageImageFileIds,
    messageImages,
    messages,
    onApplyGeneratedHtml,
    setInputErrorMessage,
  ]);

  const handleInputImagesChange = useCallback((images: UserImage[]) => {
    currentInputImagesRef.current = images;
  }, []);

  const handleStop = useCallback(async () => {
    if (!isSending) {
      return;
    }

    // Mark that user intentionally stopped - this prevents error messages
    intentionallyStoppedRef.current = true;

    // 1. Abort the client-side fetch immediately — no more waiting ~20s
    abortClientGeneration(chatId);
    sendAbortControllerRef.current = null;

    // 2. Tell the server to abort the AI generation
    try {
      await abortGeneration(chatId);
    } catch (error) {
      console.error("Failed to abort generation:", error);
    }

    // 3. Clean up local state regardless of API success
    resolveChatGeneration(chatId);
    setPendingGenerationStartedAt(null);
    setIsRequestInFlight(false);
  }, [chatId, isSending]);

  return {
    messages,
    messageImages,
    isSending,
    pendingGenerationStartedAt,
    handleSend,
    handleStop,
    handleInputImagesChange,
  };
}
