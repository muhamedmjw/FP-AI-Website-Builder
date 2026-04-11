import { useCallback, useEffect, useRef, useState } from "react";
import { ChatApiError, sendChatMessage } from "@/client/lib/api/chat-api";
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
  if (incomingMessages.length === 0) {
    return currentMessages.length === 0;
  }

  if (currentMessages.length === 0) {
    return true;
  }

  const currentLatest = getLatestMessageTimestamp(currentMessages);
  const incomingLatest = getLatestMessageTimestamp(incomingMessages);

  if (incomingLatest !== null && currentLatest !== null) {
    if (incomingLatest > currentLatest) {
      return true;
    }

    if (incomingLatest < currentLatest) {
      return false;
    }
  }

  if (incomingMessages.length > currentMessages.length) {
    return true;
  }

  if (incomingMessages.length < currentMessages.length) {
    return false;
  }

  const incomingLastMessageId = incomingMessages.at(-1)?.id;
  const currentLastMessageId = currentMessages.at(-1)?.id;

  return incomingLastMessageId !== currentLastMessageId;
}

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

  useEffect(() => {
    currentInputImagesRef.current = [];
    setMessageImages({});

    try {
      const raw = window.sessionStorage.getItem(
        `${MESSAGE_IMAGE_IDS_STORAGE_PREFIX}${chatId}`
      );

      if (!raw) {
        setMessageImageFileIds({});
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
    }
  }, [chatId]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        `${MESSAGE_IMAGE_IDS_STORAGE_PREFIX}${chatId}`,
        JSON.stringify(messageImageFileIds)
      );
    } catch {
      // Ignore storage access failures.
    }
  }, [chatId, messageImageFileIds]);

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
    const entries = Object.entries(messageImageFileIds);
    if (entries.length === 0) {
      setMessageImages({});
      return;
    }

    const nextMessageImages = entries.reduce<Record<string, MessageAttachment[]>>(
      (acc, [messageId, fileIds]) => {
        const attachments = fileIds
          .map((fileId, index) => {
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

    setMessageImages(nextMessageImages);
  }, [language, messageImageFileIds, uploadedImageCatalog]);

  const syncPendingGenerationState = useCallback(() => {
    const pending = getPendingChatGeneration(chatId);
    setPendingGenerationStartedAt(pending?.startedAt ?? null);
  }, [chatId]);

  useEffect(() => {
    syncPendingGenerationState();
    return subscribePendingChatGenerations(syncPendingGenerationState);
  }, [syncPendingGenerationState]);

  const handleSend = useCallback(async (content: string) => {
    const preSendMessages = messages;
    const preSendMessageImages = messageImages;
    const preSendMessageImageFileIds = messageImageFileIds;

    const outgoingImages = currentInputImagesRef.current.map((image, index) => ({
      fileId: image.fileId,
      fileName: image.fileName,
      dataUri: image.dataUri,
      label: `${t("imageLabel", language)} ${index + 1}`,
    }));

    const tempUserMessage: HistoryMessage = {
      id: `temp-${Date.now()}`,
      chat_id: chatId,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };

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

    const latestAssistantCreatedAt =
      [...messages]
        .reverse()
        .find((message) => message.role === "assistant")
        ?.created_at ?? null;

    setMessages((prev) => [...prev, tempUserMessage]);
    const startedAt = Date.now();
    markChatGenerationPending(chatId, startedAt, latestAssistantCreatedAt);
    setPendingGenerationStartedAt(startedAt);
    setIsRequestInFlight(true);
    setInputErrorMessage("");

    try {
      const data = await sendChatMessage(chatId, content, language, {
        imageFileIds: outgoingImages.map((image) => image.fileId),
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
      const status = error instanceof ChatApiError ? error.status : null;
      const raw = error instanceof Error ? error.message : "";
      const normalizedRaw = raw.toLowerCase();
      const isAbortLikeError =
        normalizedRaw.includes("abort") || normalizedRaw.includes("aborted");

      resolveChatGeneration(chatId);
      setPendingGenerationStartedAt(null);

      let friendly = "Failed to send message. Please try again.";
      if (
        status === 429 ||
        raw.includes("429") ||
        raw.includes("rate limit") ||
        raw.includes("Rate limit")
      ) {
        friendly = "\u23f3 Too many requests. Please wait a moment and try again.";
      } else if (
        raw.includes("token budget") ||
        raw.includes("Daily token") ||
        raw.includes("500,000")
      ) {
        friendly = "\ud83d\udcc5 You've used your 500,000 daily token budget. Come back tomorrow!";
      } else if (status === 401 || raw.includes("401") || raw.includes("Unauthorized")) {
        friendly = "\ud83d\udd12 Session expired. Please sign in again.";
      } else if (status === 500 || raw.includes("500") || raw.includes("Internal")) {
        friendly = "\u26a0\ufe0f Something went wrong on our end. Please try again.";
      } else if (
        normalizedRaw.includes("too large to process") ||
        normalizedRaw.includes("uploaded images")
      ) {
        friendly =
          "\u26a0\ufe0f Images are too large to send together. Try removing some uploaded images and sending again.";
      } else if (isAbortLikeError) {
        friendly = "Connection interrupted. Checking if your AI reply finishes in the background...";
      }

      setInputErrorMessage(friendly);
      setMessages(preSendMessages);
      setMessageImages(preSendMessageImages);
      setMessageImageFileIds(preSendMessageImageFileIds);
    } finally {
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

  return {
    messages,
    messageImages,
    isSending,
    pendingGenerationStartedAt,
    handleSend,
    handleInputImagesChange,
  };
}
