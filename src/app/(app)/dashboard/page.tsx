"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { createChat } from "@/lib/services/chat-service";

/**
 * Dashboard home — centered prompt input.
 * Typing a message creates a new chat, sends the first message,
 * and navigates to the builder.
 */
export default function DashboardPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = inputRef.current?.value.trim();
    if (!message) return;

    setErrorMessage("");
    setIsCreating(true);

    try {
      const supabase = getSupabaseBrowserClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You need to sign in again.");
      }

      // Create a new chat
      const chat = await createChat(supabase, user.id, "New Website");

      // Send the first message via the API
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: chat.id, content: message }),
      });

      if (!response.ok) {
        let apiError = "Failed to send the first message.";

        try {
          const data = await response.json();
          if (data?.error && typeof data.error === "string") {
            apiError = data.error;
          }
        } catch {
          // Keep fallback error message if response body is not JSON.
        }

        throw new Error(apiError);
      }

      // Navigate to builder and refresh to update sidebar
      router.push(`/builder/${chat.id}`);
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
        <h1 className="text-3xl font-semibold text-white">
          What website do you want to build?
        </h1>
        <p className="text-sm text-neutral-500">
          Describe your website and AI will generate it for you.
        </p>

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#0f0f0f] px-4 py-3 transition focus-within:border-white/[0.16] focus-within:ring-1 focus-within:ring-white/[0.06]">
            <input
              ref={inputRef}
              type="text"
              placeholder="e.g. A landing page for a coffee shop in Erbil..."
              disabled={isCreating}
              className="flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isCreating}
              className="rainbow-hover shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Start"}
            </button>
          </div>
          {errorMessage ? (
            <p className="mt-3 text-left text-sm text-rose-400">
              {errorMessage}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
