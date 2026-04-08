"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/client/lib/supabase-browser";
import { addMessage, createChat } from "@/shared/services/chat-service";
import { sendChatMessage } from "@/client/lib/api/chat-api";
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
import { MAX_PROMPT_LENGTH } from "@/shared/constants/limits";

/**
 * Authenticated home screen - centered prompt input.
 * Typing a message creates a new chat, sends the first message,
 * and navigates to the chat page.
 */
export default function HomePage() {
  const { language } = useLanguage();
  const displayModelName = getDisplayModelName(PRIMARY_MODEL);
  const disclaimerTemplate = t("aiDisclaimer", language);
  const disclaimerText = disclaimerTemplate.replace("{model}", displayModelName);
  const [disclaimerPrefix, disclaimerSuffix = ""] = disclaimerTemplate.split("{model}");
  const hasModelPlaceholder = disclaimerTemplate.includes("{model}");
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadMessage, setDownloadMessage] = useState("");
  const creatingSeconds = useElapsedSeconds(isCreating);
  const statusRotationSeconds = 8;
  const hasProcessedPendingGuestActions = useRef(false);
  const isProcessingPendingGuestActions = useRef(false);

  function adjustHeight(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
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
  }, [language, router]);

  useEffect(() => {
    if (inputRef.current) {
      adjustHeight(inputRef.current);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

      const chat = await createChat(supabase, user.id, "New Website");
      await addMessage(supabase, chat.id, "user", trimmedMessage);
      markChatGenerationPending(chat.id, Date.now(), null);

      shouldResetLoadingState = false;
      router.push(`/chat/${chat.id}`);
      router.refresh();

      void sendChatMessage(chat.id, trimmedMessage, language, {
        skipUserMessageSave: true,
      }).catch((error) => {
        console.error("Background AI send failed after navigation:", error);
      });
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";

      let friendly = "Failed to send message. Please try again.";
      if (raw.includes("429") || raw.includes("rate limit") || raw.includes("Rate limit")) {
        friendly = "\u23f3 Too many requests. Please wait a moment and try again.";
      } else if (raw.includes("token budget") || raw.includes("Daily token") || raw.includes("500,000")) {
        friendly = "\ud83d\udcc5 You've used your 500,000 daily token budget. Come back tomorrow!";
      } else if (raw.includes("401") || raw.includes("Unauthorized")) {
        friendly = "\ud83d\udd12 Session expired. Please sign in again.";
      } else if (raw.includes("500") || raw.includes("Internal")) {
        friendly = "\u26a0\ufe0f Something went wrong on our end. Please try again.";
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
          <h1 className="text-2xl font-semibold leading-snug text-[var(--app-text-heading)] sm:text-4xl">
            {t("heroTitle", language)}
          </h1>
          <p className="mt-2 text-sm text-[var(--app-text-tertiary)] sm:text-sm">
            {t("heroSubtitle", language)}
          </p>
          {downloadMessage ? (
            <p className="mt-3 text-sm text-emerald-400">{downloadMessage}</p>
          ) : null}

          <form onSubmit={handleSubmit} className="mx-auto mt-8 w-full max-w-2xl min-h-75" aria-busy={isCreating}>
          {isCreating ? (
            <div className="ui-fade-up rounded-2xl border border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-4 text-left shadow-[var(--app-shadow-md)] sm:p-5">
              <input
                type="text"
                value={submittedPrompt}
                readOnly
                disabled
                aria-busy={isCreating}
                tabIndex={-1}
                className="sr-only"
              />
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
              <p className="mt-2 text-xs text-[var(--app-text-tertiary)] sm:text-sm">
                {submittedPrompt}
              </p>
            </div>
          ) : (
            <div className="flex w-full flex-col rounded-2xl bg-[var(--app-card-bg)]/80 p-1.5 shadow-[var(--app-shadow-lg)] backdrop-blur-sm sm:p-2">
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
                className="w-full resize-none overflow-hidden rounded-xl bg-transparent px-2.5 py-2.5 text-sm leading-relaxed text-[var(--app-input-text)] placeholder:text-[var(--app-text-tertiary)] focus:outline-none disabled:opacity-50 sm:px-3 sm:py-3 sm:text-base"
                style={{
                  height: "auto",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              />
              <div className="flex items-center justify-between px-1 pb-1">
                <div aria-hidden="true" />
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-btn-primary-bg)] text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:bg-[var(--app-btn-primary-hover)] hover:shadow-[var(--app-shadow-md)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 sm:h-11 sm:w-11"
                  title={isCreating ? "Creating..." : "Start"}
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
          )}
          {errorMessage ? (
            <p className="mt-3 text-left text-sm text-rose-400" role="alert">
              {errorMessage}
            </p>
          ) : null}
          </form>
        </div>
      </div>
      <p className="relative top-[1px] mx-auto w-full max-w-2xl whitespace-normal pb-2 pt-0.5 text-center text-xs text-[var(--app-text-muted)]">
        {hasModelPlaceholder ? (
          <>
            {disclaimerPrefix}
            <span className="font-medium text-[var(--app-text-tertiary)]">{displayModelName}</span>
            {disclaimerSuffix}
          </>
        ) : (
          disclaimerText
        )}
      </p>
    </div>
  );
}
