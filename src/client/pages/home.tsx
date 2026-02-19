"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/client/lib/supabase-browser";
import { addMessage, createChat } from "@/shared/services/chat-service";
import { sendChatMessage } from "@/client/lib/chat-api";
import { getCurrentUser } from "@/shared/services/user-service";
import {
  consumePendingGuestZipPrompt,
  downloadWebsiteZip,
} from "@/client/lib/zip-download";
import {
  consumePendingGuestChatSession,
} from "@/client/lib/guest-chat-handoff";

/**
 * Authenticated home screen - centered prompt input.
 * Typing a message creates a new chat, sends the first message,
 * and navigates to the chat page.
 */
export default function ChatHome() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadMessage, setDownloadMessage] = useState("");

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

    setErrorMessage("");
    setIsCreating(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const user = await getCurrentUser(supabase);

      if (!user) {
        throw new Error("You need to sign in again.");
      }

      const chat = await createChat(supabase, user.id, "New Website");
      await sendChatMessage(chat.id, message);

      router.push(`/chat/${chat.id}`);
      router.refresh();
    } catch (error) {
      console.error("Failed to create chat:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <div className="w-full max-w-2xl space-y-4 text-center">
        <h1 className="text-3xl font-semibold text-[var(--app-text-heading)]">
          What website do you want to build?
        </h1>
        <p className="text-sm text-[var(--app-text-tertiary)]">
          Describe your website and AI will generate it for you.
        </p>
        {downloadMessage ? (
          <p className="text-sm text-emerald-400">{downloadMessage}</p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-4 py-3 shadow-[var(--app-shadow-sm)] transition focus-within:border-[var(--app-input-focus-border)]">
            <input
              ref={inputRef}
              type="text"
              placeholder="e.g. A landing page for a coffee shop in Erbil..."
              disabled={isCreating}
              className="flex-1 bg-transparent text-sm text-[var(--app-input-text)] placeholder:text-[var(--app-text-tertiary)] focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isCreating}
              className="shrink-0 rounded-lg bg-[var(--app-btn-primary-bg)] px-4 py-2 text-sm font-semibold text-[var(--app-btn-primary-text)] transition hover:bg-[var(--app-btn-primary-hover)] disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Start"}
            </button>
          </div>
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
