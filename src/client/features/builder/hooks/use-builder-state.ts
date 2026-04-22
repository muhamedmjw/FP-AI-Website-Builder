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
  initialIsLocked?: boolean;
  initialNeedsAgeVerification?: boolean;
};

type PreSendSnapshot = {
  messages: HistoryMessage[];
  messageImages: Record<string, MessageAttachment[]>;
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
    image_file_ids: params.inputImages.map((img) => img.fileId),
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

function buildFriendlySendErrorMessage(error: unknown, language: AppLanguage): string {
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
    return t("errorTooManyRequests", language);
  }

  if (
    rawMessage.includes("token budget") ||
    rawMessage.includes("Daily token") ||
    rawMessage.includes("500,000")
  ) {
    return t("errorDailyTokenBudget", language);
  }

  if (
    status === 401 ||
    rawMessage.includes("401") ||
    rawMessage.includes("Unauthorized")
  ) {
    return t("errorSessionExpired", language);
  }

  if (
    status === 500 ||
    rawMessage.includes("500") ||
    rawMessage.includes("Internal")
  ) {
    return t("errorServerError", language);
  }

  if (
    normalizedRawMessage.includes("too large to process") ||
    normalizedRawMessage.includes("uploaded images")
  ) {
    return t("errorImagesTooLarge", language);
  }

  if (isAbortLikeError) {
    return t("errorConnectionInterrupted", language);
  }

  return t("errorSendFailed", language);
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
  initialIsLocked = false,
  initialNeedsAgeVerification = false,
}: UseBuilderStateParams) {
  const currentInputImagesRef = useRef<UserImage[]>([]);
  const [messages, setMessages] = useState<HistoryMessage[]>(initialMessages);
  const [messageImages, setMessageImages] = useState<Record<string, MessageAttachment[]>>({});
  const [uploadedImageCatalog, setUploadedImageCatalog] = useState<Record<string, UserImage>>({});
  const [isRequestInFlight, setIsRequestInFlight] = useState(false);
  const [pendingGenerationStartedAt, setPendingGenerationStartedAt] = useState<number | null>(
    null
  );
  
  const [isChatLocked, setIsChatLocked] = useState(initialIsLocked);
  const [needsAgeVerification, setNeedsAgeVerification] = useState(initialNeedsAgeVerification);
  const [showAgeVerification, setShowAgeVerification] = useState(initialNeedsAgeVerification);


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

  useEffect(() => {
    currentInputImagesRef.current = [];
    setMessageImages({});
  }, [chatId]);

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
      const nextMessageImages = messages.reduce<Record<string, MessageAttachment[]>>(
        (acc, message) => {
          if (!message.image_file_ids || message.image_file_ids.length === 0) {
            return acc;
          }

          const attachments = message.image_file_ids
            .map((fileId, index) => {
              // 1. If we already have the fully constructed image in state (e.g. from an optimistic send), keep it!
              const existingAttachment = currentImages[message.id]?.find((a) => a.fileId === fileId);
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
            acc[message.id] = attachments;
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
  }, [language, messages, uploadedImageCatalog]);

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

      if (data.aiResponseType === "locked") {
        setMessages(data.messages);
        setIsChatLocked(true);
      } else if (data.aiResponseType === "age_verification_required") {
        setMessages(data.messages);
        setNeedsAgeVerification(true);
        setShowAgeVerification(true);
      } else {
        setMessages(data.messages);
      }

      if (outgoingImages.length > 0 && data.userMessage && data.aiResponseType !== "age_verification_required" && data.aiResponseType !== "locked") {
        // React batches these updates in async handlers to keep message and attachments in sync.
        setMessageImages((prev) => {
          const next = { ...prev };
          delete next[tempUserMessage.id];
          next[data.userMessage.id] = outgoingImages;
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



      setInputErrorMessage(buildFriendlySendErrorMessage(error, language));
      setMessages(preSendSnapshot.messages);
      setMessageImages(preSendSnapshot.messageImages);
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

  const handleAgeVerificationSuccess = useCallback(async () => {
    setShowAgeVerification(false);
    
    try {
      const response = await fetch("/api/chat/verify-age", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          acknowledgment: "I take responsibility",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to verify age.");
      }

      setNeedsAgeVerification(false);
      // The user is now verified. They can just continue chatting naturally.
    } catch (error) {
      setInputErrorMessage("Failed to verify age. Please try again.");
    }
  }, [chatId, setInputErrorMessage]);

  const handleAgeVerificationCancel = useCallback(() => {
    setShowAgeVerification(false);
    // needsAgeVerification stays true — input remains disabled
  }, []);

  const handleReopenAgeVerification = useCallback(() => {
    setShowAgeVerification(true);
  }, []);

  return {
    messages,
    messageImages,
    isSending,
    pendingGenerationStartedAt,
    handleSend,
    handleStop,
    handleInputImagesChange,
    isChatLocked,
    needsAgeVerification,
    showAgeVerification,
    handleAgeVerificationSuccess,
    handleAgeVerificationCancel,
    handleReopenAgeVerification,
  };
}
