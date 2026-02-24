"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/client/lib/supabase-browser";
import { addMessage, createChat } from "@/shared/services/chat-service";
import { sendChatMessage } from "@/client/lib/api/chat-api";
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
    <div className="flex h-full flex-col items-center justify-center px-6 sm:px-8">
      <div className="w-full max-w-2xl space-y-5 text-center">
        <h1 className="text-2xl font-semibold leading-snug text-[var(--app-text-heading)] sm:text-3xl">
          What website do you want to build?
        </h1>
        <p className="text-sm text-[var(--app-text-tertiary)] sm:text-sm">
          Describe your website and AI will generate it for you.
        </p>
        {downloadMessage ? (
          <p className="text-sm text-emerald-400">{downloadMessage}</p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8">
          <div className="flex items-center gap-2 rounded-2xl bg-[var(--app-card-bg)]/80 p-1.5 shadow-[var(--app-shadow-lg)] backdrop-blur-sm sm:p-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Describe the website you want to build..."
              disabled={isCreating}
              className="flex-1 rounded-xl bg-transparent px-2.5 py-2 text-sm text-[var(--app-input-text)] placeholder:text-[var(--app-text-tertiary)] focus:outline-none disabled:opacity-50 sm:px-3 sm:py-2.5 sm:text-base"
            />
            <button
              type="submit"
              disabled={isCreating}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-btn-primary-bg)] text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:bg-[var(--app-btn-primary-hover)] hover:shadow-[var(--app-shadow-md)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 sm:h-11 sm:w-11"
              title={isCreating ? "Creating..." : "Start"}
            >
              <SendHorizontal size={17} />
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
