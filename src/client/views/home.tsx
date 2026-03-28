"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/client/lib/supabase-browser";
import { addMessage, createChat, deleteChat } from "@/shared/services/chat-service";
import { sendChatMessage } from "@/client/lib/api/chat-api";
import { getCurrentUser } from "@/shared/services/user-service";
import {
  consumePendingGuestZipPrompt,
  downloadWebsiteZip,
} from "@/client/lib/zip-download";
import {
  consumePendingGuestChatSession,
} from "@/client/lib/guest-chat-handoff";
import PromptSuggestions from "@/client/features/chat/prompt-suggestions";
import { useLanguage } from "@/client/lib/language-context";
import { useElapsedSeconds } from "@/client/lib/hooks/use-elapsed-seconds";
import { t } from "@/shared/constants/translations";

const AI_PROVIDER_LABEL = "NVIDIA Nemotron";

/**
 * Authenticated home screen - centered prompt input.
 * Typing a message creates a new chat, sends the first message,
 * and navigates to the chat page.
 */
export default function HomePage() {
  const { language } = useLanguage();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadMessage, setDownloadMessage] = useState("");
  const creatingSeconds = useElapsedSeconds(isCreating);

  const creatingStatusKey =
    creatingSeconds >= 5
      ? "generatingWebsite"
      : creatingSeconds >= 2
        ? "sendingPrompt"
        : "creatingWorkspace";

  useEffect(() => {
    let isCancelled = false;

    async function restoreGuestSessionAndDownload() {
      const supabase = getSupabaseBrowserClient();
      const user = await getCurrentUser(supabase);

      if (!user) {
        return;
      }

      let restoredChatId: string | null = null;
      const pendingGuestSession = consumePendingGuestChatSession();

      if (pendingGuestSession && pendingGuestSession.messages.length > 0) {
        setDownloadMessage("Restoring your guest chat...");

        const chat = await createChat(
          supabase,
          user.id,
          pendingGuestSession.title || "Guest Chat"
        );

        for (const message of pendingGuestSession.messages) {
          await addMessage(supabase, chat.id, message.role, message.content);
        }

        restoredChatId = chat.id;
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

    async function runPendingGuestActions() {
      try {
        await restoreGuestSessionAndDownload();
      } catch (error) {
        console.error("Failed to restore guest session state:", error);

        if (!isCancelled) {
          setDownloadMessage(
            "Could not restore guest chat/download. Please try again."
          );
        }
      }
    }

    void runPendingGuestActions();

    return () => {
      isCancelled = true;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = inputRef.current?.value.trim();
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
      try {
        await sendChatMessage(chat.id, trimmedMessage, language);
        shouldResetLoadingState = false;
        router.push(`/chat/${chat.id}`);
        router.refresh();
      } catch (error) {
        try {
          await deleteChat(supabase, chat.id);
        } catch {
          // Ignore cleanup errors.
        }
        throw error;
      }
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
      if (shouldResetLoadingState) {
        setIsCreating(false);
        setSubmittedPrompt("");
      }
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 sm:px-8">
      <div className="w-full max-w-2xl space-y-5 text-center">
        <h1 className="text-2xl font-semibold leading-snug text-[var(--app-text-heading)] sm:text-3xl">
          {t("heroTitle", language)}
        </h1>
        <p className="text-sm text-[var(--app-text-tertiary)] sm:text-sm">
          {t("heroSubtitle", language)}
        </p>
        <PromptSuggestions onSend={(prompt) => void startChatWithPrompt(prompt)} />
        {downloadMessage ? (
          <p className="text-sm text-emerald-400">{downloadMessage}</p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8" aria-busy={isCreating}>
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
            <div className="flex items-center gap-2 rounded-2xl bg-[var(--app-card-bg)]/80 p-1.5 shadow-[var(--app-shadow-lg)] backdrop-blur-sm sm:p-2">
              <input
                ref={inputRef}
                type="text"
                placeholder={t("inputPlaceholder", language)}
                disabled={isCreating}
                aria-busy={isCreating}
                className="flex-1 rounded-xl bg-transparent px-2.5 py-2 text-sm text-[var(--app-input-text)] placeholder:text-[var(--app-text-tertiary)] focus:outline-none disabled:opacity-50 sm:px-3 sm:py-2.5 sm:text-base"
              />
              <span className="shrink-0 select-none rounded-full border border-[var(--app-border)] bg-[var(--app-hover-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--app-text-muted)]">
                {AI_PROVIDER_LABEL}
              </span>
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
          )}
          {errorMessage ? (
            <p className="mt-3 text-left text-sm text-rose-400" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
