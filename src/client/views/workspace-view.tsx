"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookText, ImagePlus, X } from "lucide-react";
import PromptGuideModal from "../components/ui/prompt-guide-modal";
import { getSupabaseBrowserClient } from "@/client/lib/supabase-browser";
import { useUserImages } from "@/client/lib/hooks/use-user-images";
import { addMessage, createChat } from "@/shared/services/chat-service";
import { sendChatMessage, ChatApiError } from "@/client/lib/api/chat-api";
import { registerClientAbort, completeClientGeneration } from "@/client/lib/client-generation-abort";
import { markChatGenerationPending } from "@/client/lib/chat-pending-generations";
import { getCurrentUser } from "@/shared/services/user-service";
import {
  consumePendingGuestZipPrompt,
  downloadWebsiteZip,
} from "@/client/lib/zip-download";
import {
  consumePendingGuestChatSession,
  getImportedGuestChatId,
  markGuestChatSessionImported,
} from "@/client/lib/guest-chat-handoff";
import { useLanguage } from "@/client/lib/language-context";
import { useElapsedSeconds } from "@/client/lib/hooks/use-elapsed-seconds";
import { t } from "@/shared/constants/translations";
import { getDisplayModelName, PRIMARY_MODEL } from "@/shared/constants/ai";
import { MAX_PROMPT_LENGTH, MAX_ATTACHMENTS_PER_MESSAGE } from "@/shared/constants/limits";

/**
 * Authenticated home screen - centered prompt input.
 * Typing a message creates a new chat, sends the first message,
 * and navigates to the chat page.
 */
export default function WorkspaceView() {
  const { language } = useLanguage();
  const displayModelName = getDisplayModelName(PRIMARY_MODEL);
  const disclaimerTemplate = t("aiDisclaimer", language);
  const disclaimerText = disclaimerTemplate.replace("{model}", displayModelName);
  const [disclaimerPrefix, disclaimerSuffix = ""] = disclaimerTemplate.split("{model}");
  const hasModelPlaceholder = disclaimerTemplate.includes("{model}");
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftChatPromiseRef = useRef<Promise<string> | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isPreparingDraftChat, setIsPreparingDraftChat] = useState(false);
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [imageErrorMessage, setImageErrorMessage] = useState("");
  const [isPromptGuideOpen, setIsPromptGuideOpen] = useState(false);
  const [draftChatId, setDraftChatId] = useState<string | null>(null);
  const draftChatIdRef = useRef<string | null>(null); // Track id without closure staleness
  const [downloadMessage, setDownloadMessage] = useState("");
  const {
    images,
    isLoading: isImageLoading,
    uploadImage,
    deleteImage,
  } = useUserImages(draftChatId ?? undefined, { autoLoad: false });
  const creatingSeconds = useElapsedSeconds(isCreating);
  const statusRotationSeconds = 8;
  const hasProcessedPendingGuestActions = useRef(false);
  const isProcessingPendingGuestActions = useRef(false);
  const attachmentsFull = images.length >= MAX_ATTACHMENTS_PER_MESSAGE;
  const charCount = inputValue.length;
  const shouldShowCounter = charCount > MAX_PROMPT_LENGTH * 0.8;
  const isAtPromptLimit = charCount >= MAX_PROMPT_LENGTH;

  /**
   * Ensures there is exactly one in-flight draft chat creation call.
   * Concurrent callers share draftChatPromiseRef.current to avoid duplicate chats.
   */
  async function ensureDraftChatId(): Promise<string> {
    if (draftChatIdRef.current) {
      return draftChatIdRef.current;
    }

    if (draftChatId) {
      draftChatIdRef.current = draftChatId;
      return draftChatId;
    }

    if (draftChatPromiseRef.current) {
      return draftChatPromiseRef.current;
    }

    setIsPreparingDraftChat(true);

    const creatingPromise = (async () => {
      const supabase = getSupabaseBrowserClient();
      const user = await getCurrentUser(supabase);

      if (!user) {
        throw new Error("You need to sign in again.");
      }

      const draftChat = await createChat(supabase, user.id, "New Chat");
      setDraftChatId(draftChat.id);
      draftChatIdRef.current = draftChat.id;
      return draftChat.id;
    })();

    draftChatPromiseRef.current = creatingPromise;

    try {
      return await creatingPromise;
    } finally {
      draftChatPromiseRef.current = null;
      setIsPreparingDraftChat(false);
    }
  }

  function adjustHeight(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      
      if (isImageLoading || isPreparingDraftChat) {
        return;
      }
      
      event.currentTarget.form?.requestSubmit();
    }
  }

  const creatingStatusKey =
    Math.floor(creatingSeconds / statusRotationSeconds) % 2 === 0
      ? "creatingWorkspace"
      : "sendingPrompt";

  useEffect(() => {
    let isCancelled = false;
    const supabase = getSupabaseBrowserClient();

    async function restoreGuestSessionAndDownloadForUser(userId: string) {
      let restoredChatId: string | null = null;
      const pendingGuestSession = consumePendingGuestChatSession();

      if (pendingGuestSession && pendingGuestSession.messages.length > 0) {
        setDownloadMessage("Restoring your guest chat...");
        let restoredFromExistingImport = false;

        const previouslyImportedChatId = getImportedGuestChatId(
          pendingGuestSession.sessionId
        );

        if (previouslyImportedChatId) {
          const { data: existingChat } = await supabase
            .from("chats")
            .select("id")
            .eq("id", previouslyImportedChatId)
            .eq("user_id", userId)
            .maybeSingle();

          if (existingChat?.id) {
            restoredChatId = existingChat.id;
            restoredFromExistingImport = true;
          }
        }

        if (!restoredChatId) {
          const chat = await createChat(
            supabase,
            userId,
            pendingGuestSession.title || "Guest Chat"
          );

          for (const message of pendingGuestSession.messages) {
            await addMessage(supabase, chat.id, message.role, message.content);
          }

          restoredChatId = chat.id;
        }

        let shouldRestoreWebsiteHtml =
          pendingGuestSession.websiteGenerated &&
          typeof pendingGuestSession.html === "string" &&
          pendingGuestSession.html.trim().length > 0;

        if (restoredChatId && shouldRestoreWebsiteHtml && restoredFromExistingImport) {
          const { data: existingWebsite } = await supabase
            .from("websites")
            .select("id")
            .eq("chat_id", restoredChatId)
            .maybeSingle();

          if (existingWebsite?.id) {
            shouldRestoreWebsiteHtml = false;
          }
        }

        if (restoredChatId && shouldRestoreWebsiteHtml) {
          const restoreResponse = await fetch("/api/website/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chatId: restoredChatId,
              html: pendingGuestSession.html,
              language,
            }),
          });

          if (!restoreResponse.ok) {
            const restoreData = (await restoreResponse
              .json()
              .catch(() => null)) as { error?: unknown } | null;
            throw new Error(
              typeof restoreData?.error === "string"
                ? restoreData.error
                : "Could not restore your generated website."
            );
          }
        }

        if (restoredChatId) {
          markGuestChatSessionImported(
            pendingGuestSession.sessionId,
            restoredChatId
          );
        }
      }

      const pendingPrompt = consumePendingGuestZipPrompt();

      if (pendingPrompt) {
        setDownloadMessage("Starting your pending ZIP download...");

        await downloadWebsiteZip(pendingPrompt);
      }

      if (restoredChatId && !isCancelled) {
        window.location.assign(`/chat/${restoredChatId}`);
        return;
      }

      if (!isCancelled && pendingPrompt) {
        setDownloadMessage("Your ZIP download has started.");
        setTimeout(() => {
          if (!isCancelled) {
            setDownloadMessage("");
          }
        }, 3000);
      }
    }

    async function runPendingGuestActionsIfAuthenticated() {
      if (isProcessingPendingGuestActions.current || hasProcessedPendingGuestActions.current) {
        return;
      }

      isProcessingPendingGuestActions.current = true;

      try {
        const user = await getCurrentUser(supabase);

        if (!user) {
          return;
        }

        await restoreGuestSessionAndDownloadForUser(user.id);
        hasProcessedPendingGuestActions.current = true;
      } catch (error) {
        console.error("Failed to restore guest session state:", error);

        if (!isCancelled) {
          setDownloadMessage(
            "Could not restore guest chat/download. Please try again."
          );
        }
      } finally {
        isProcessingPendingGuestActions.current = false;
      }
    }

    const retryIntervalId = window.setInterval(() => {
      if (hasProcessedPendingGuestActions.current || isCancelled) {
        return;
      }

      void runPendingGuestActionsIfAuthenticated();
    }, 750);

    const timeoutId = window.setTimeout(() => {
      window.clearInterval(retryIntervalId);
    }, 10000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        void runPendingGuestActionsIfAuthenticated();
      }
    });

    void runPendingGuestActionsIfAuthenticated();

    return () => {
      isCancelled = true;
      window.clearInterval(retryIntervalId);
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [language]);

  useEffect(() => {
    if (inputRef.current) {
      adjustHeight(inputRef.current);
    }
  }, []);

  function handleOpenImagePicker() {
    if (isCreating) {
      return;
    }

    if (attachmentsFull) {
      setImageErrorMessage(t("errorMaxImagesPerMessage", language).replace("{max}", String(MAX_ATTACHMENTS_PER_MESSAGE)));
      return;
    }

    fileInputRef.current?.click();
  }

  async function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    setImageErrorMessage("");
    setErrorMessage("");

    const remainingSlots = MAX_ATTACHMENTS_PER_MESSAGE - images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      setImageErrorMessage(
        t("errorImageSlotsRemaining", language)
          .replace("{remaining}", String(remainingSlots))
          .replace("{skipped}", String(files.length - remainingSlots))
      );
    }

    for (const file of filesToProcess) {
      if (!file.type.startsWith("image/")) {
        setImageErrorMessage(t("errorOnlyImageFiles", language));
        continue;
      }

      try {
        const chatIdForUpload = await ensureDraftChatId();
        await uploadImage(file, { chatIdOverride: chatIdForUpload });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t("errorFailedToUploadImage", language);
        setImageErrorMessage(message);
      }
    }
  }

  async function handleRemoveImage(fileId: string) {
    setImageErrorMessage("");

    try {
      await deleteImage(fileId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("errorFailedToRemoveImage", language);
      setImageErrorMessage(message);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isImageLoading || isPreparingDraftChat) {
      return;
    }

    const message = inputValue.trim();
    if (!message) return;

    await startChatWithPrompt(message);
  }

  async function startChatWithPrompt(message: string) {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isCreating) return;

    setErrorMessage("");
    setSubmittedPrompt(trimmedMessage);
    setIsCreating(true);
    let shouldResetLoadingState = true;

    try {
      const supabase = getSupabaseBrowserClient();
      const user = await getCurrentUser(supabase);

      if (!user) {
        throw new Error("You need to sign in again.");
      }

      const placeholderTitle = trimmedMessage.split(/\s+/).slice(0, 4).join(" ");
      const chatIdToUse = draftChatId
        ? draftChatId
        : (
          await createChat(
            supabase,
            user.id,
            placeholderTitle || "New Chat"
          )
        ).id;

      const imageFileIds = images.length > 0 ? images.map((img) => img.fileId) : undefined;
      await addMessage(supabase, chatIdToUse, "user", trimmedMessage, imageFileIds);
      markChatGenerationPending(chatIdToUse, Date.now(), null);

      shouldResetLoadingState = false;
      router.push(`/chat/${chatIdToUse}`);
      // Refresh to sync the sidebar chat list immediately with the new chat
      router.refresh();

      const abortController = new AbortController();
      registerClientAbort(chatIdToUse, abortController);

      void sendChatMessage(chatIdToUse, trimmedMessage, language, {
        skipUserMessageSave: true,
        imageFileIds: images.map((image) => image.fileId),
        signal: abortController.signal,
      }).catch((error) => {
        const isAbortError = error instanceof DOMException && error.name === "AbortError";
        const isCancellationError =
          (error instanceof ChatApiError && error.status === 499) ||
          (error instanceof Error &&
            (error.message.toLowerCase().includes("cancelled") ||
             error.message.toLowerCase().includes("aborted")));
        
        if (!isAbortError && !isCancellationError) {
          console.error("Background AI send failed after navigation:", error);
        }
      }).finally(() => {
        completeClientGeneration(chatIdToUse);
      });
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";

      let friendly = t("errorSendFailed", language);
      if (raw.includes("429") || raw.includes("rate limit") || raw.includes("Rate limit")) {
        friendly = t("errorTooManyRequests", language);
      } else if (raw.includes("token budget") || raw.includes("Daily token") || raw.includes("500,000")) {
        friendly = t("errorDailyTokenBudget", language);
      } else if (raw.includes("401") || raw.includes("Unauthorized")) {
        friendly = t("errorSessionExpired", language);
      } else if (raw.includes("500") || raw.includes("Internal")) {
        friendly = t("errorServerError", language);
      }

      setErrorMessage(friendly);
    } finally {
      setInputValue("");
      setTimeout(() => {
        if (inputRef.current) {
          adjustHeight(inputRef.current);
        }
      }, 0);

      if (shouldResetLoadingState) {
        setIsCreating(false);
        setSubmittedPrompt("");
      }
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 sm:px-8">
      <div className="flex flex-1 items-center justify-center">
        <div className="mx-auto w-full max-w-2xl text-center">
          <h1 className="text-2xl font-semibold leading-snug text-(--app-text-heading) sm:text-4xl">
            {t("heroTitle", language)}
          </h1>
          <p className="mt-2 text-sm text-(--app-text-tertiary) sm:text-sm">
            {t("heroSubtitle", language)}
          </p>
          {downloadMessage ? (
            <p className="mt-3 text-sm text-emerald-400">{downloadMessage}</p>
          ) : null}

          <form onSubmit={handleSubmit} className="mx-auto mt-8 w-full max-w-2xl" aria-busy={isCreating}>
          {isCreating ? (
            <div
              key="creating-view"
              className="ui-fade-up rounded-2xl border border-(--app-card-border) bg-(--app-card-bg) p-4 text-left shadow-(--app-shadow-md) sm:p-5"
            >
              <div className="flex items-center gap-2.5">
                <span className="generating-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <p
                  className="generating-status text-xs font-medium sm:text-sm"
                  role="status"
                  aria-live="polite"
                >
                  {t(creatingStatusKey, language)}
                </p>
              </div>
              <p className="mt-2 text-xs text-(--app-text-tertiary) sm:text-sm">
                {submittedPrompt}
              </p>
            </div>
          ) : (
            <div
              key="editing-view"
              className="flex w-full flex-col rounded-2xl bg-(--app-card-bg)/80 p-1.5 shadow-(--app-shadow-lg) backdrop-blur-sm sm:p-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesSelected}
                className="hidden"
                aria-hidden="true"
              />
              {images.length > 0 ? (
                <div className="px-2.5 pb-1.5 pt-2 sm:px-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {images.map((image, index) => (
                      <div key={image.fileId} className="relative group/thumb">
                        <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-(--app-card-border) shadow-sm transition-transform hover:scale-105 sm:h-16 sm:w-16">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.dataUri}
                            alt={image.fileName}
                            className="h-full w-full object-cover"
                          />
                          {/* Tag badge overlay */}
                          <span className="absolute bottom-0 inset-x-0 bg-black/60 py-0.5 text-center text-[9px] font-semibold text-white/90 backdrop-blur-sm">
                            {t("imageLabel", language)} {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              void handleRemoveImage(image.fileId);
                            }}
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-(--app-card-border) bg-(--app-panel) text-(--app-text-secondary) opacity-0 transition-all group-hover/thumb:opacity-100 hover:text-rose-400 hover:border-rose-400/50"
                            aria-label="Remove image"
                            title="Remove image"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {!attachmentsFull ? (
                      <button
                        type="button"
                        onClick={handleOpenImagePicker}
                        disabled={isCreating || isImageLoading || isPreparingDraftChat}
                        className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-(--app-card-border) text-(--app-text-tertiary) transition-colors hover:border-(--app-text-secondary) hover:text-(--app-text-secondary) disabled:opacity-40 sm:h-16 sm:w-16"
                        title="Add more images"
                        aria-label="Add more images"
                      >
                        <ImagePlus size={18} />
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-[10px] text-(--app-text-muted)">
                    {images.length}/{MAX_ATTACHMENTS_PER_MESSAGE} images attached
                  </p>
                </div>
              ) : null}
              <textarea
                ref={inputRef}
                rows={1}
                value={inputValue}
                onChange={(event) => {
                  setInputValue(event.target.value);
                  adjustHeight(event.currentTarget);
                }}
                onKeyDown={handleKeyDown}
                placeholder={t("inputPlaceholder", language)}
                disabled={isCreating}
                maxLength={MAX_PROMPT_LENGTH}
                aria-busy={isCreating}
                className="w-full resize-none overflow-hidden rounded-xl bg-transparent px-2.5 py-2.5 text-sm leading-relaxed text-(--app-input-text) placeholder:text-(--app-text-tertiary) focus:outline-none disabled:opacity-50 sm:px-3 sm:py-3 sm:text-base"
                style={{
                  height: "auto",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              />
              {shouldShowCounter ? (
                <p
                  className={`px-2.5 pb-0.5 text-right text-[10px] sm:px-3 ${
                    isAtPromptLimit ? "text-rose-400" : "text-(--app-text-muted)"
                  }`}
                  aria-live="polite"
                >
                  {charCount}/{MAX_PROMPT_LENGTH}
                </p>
              ) : null}
              <div className="flex items-center justify-between px-1 pb-1">
                <button
                  type="button"
                  onClick={handleOpenImagePicker}
                  disabled={isCreating || isImageLoading || isPreparingDraftChat || attachmentsFull}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-(--app-text-secondary) transition-colors hover:bg-(--app-hover-bg-strong) hover:text-(--app-text-heading) disabled:opacity-40 sm:h-11 sm:w-11"
                  title={attachmentsFull ? `Max ${MAX_ATTACHMENTS_PER_MESSAGE} images` : "Attach images"}
                  aria-label={attachmentsFull ? `Max ${MAX_ATTACHMENTS_PER_MESSAGE} images` : "Attach images"}
                >
                  <ImagePlus size={18} />
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPromptGuideOpen(true)}
                    className="group prompt-guide-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 sm:h-11 sm:w-11"
                    title="Prompt writing guide"
                    aria-label="Prompt writing guide"
                  >
                    <BookText
                      size={18}
                      className="text-(--app-text-secondary) transition-all duration-300 group-hover:prismatic-icon"
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isCreating || isImageLoading || isPreparingDraftChat}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--app-btn-primary-bg) text-(--app-btn-primary-text) shadow-(--app-shadow-sm) transition hover:bg-(--app-btn-primary-hover) hover:shadow-(--app-shadow-md) hover:-translate-y-px active:translate-y-0 disabled:opacity-50 sm:h-11 sm:w-11"
                    title={isCreating ? "Creating..." : isImageLoading ? "Uploading image..." : isPreparingDraftChat ? "Preparing..." : "Start"}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 19V6" />
                      <path d="M6.5 11.5L12 6l5.5 5.5" />
                    </svg>
                  </button>
                </div>
              </div>
              {imageErrorMessage ? (
                <p className="px-2.5 pb-0.5 text-[10px] text-rose-400 sm:px-3" role="alert">
                  {imageErrorMessage}
                </p>
              ) : null}
            </div>
          )}
          {errorMessage ? (
            <p className="mt-3 text-left text-sm text-rose-400" role="alert">
              {errorMessage}
            </p>
          ) : null}
          </form>
        </div>
      </div>
      <p className="relative top-px mx-auto w-full max-w-2xl whitespace-normal pb-2 pt-0.5 text-center text-xs text-(--app-text-muted)">
        {hasModelPlaceholder ? (
          <>
            {disclaimerPrefix}
            <span className="font-medium text-(--app-text-tertiary)">{displayModelName}</span>
            {disclaimerSuffix}
          </>
        ) : (
          disclaimerText
        )}
      </p>
      <PromptGuideModal
        isOpen={isPromptGuideOpen}
        onClose={() => setIsPromptGuideOpen(false)}
      />
    </div>
  );
}
