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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = inputRef.current?.value.trim();
    if (!message) return;

    setIsCreating(true);

    try {
      const supabase = getSupabaseBrowserClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Create a new chat
      const chat = await createChat(supabase, user.id, "New Website");

      // Send the first message via the API
      await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: chat.id, content: message }),
      });

      // Navigate to builder
      router.push(`/builder/${chat.id}`);
    } catch (error) {
      console.error("Failed to create chat:", error);
      setIsCreating(false);
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <div className="w-full max-w-2xl space-y-4 text-center">
        <h1 className="text-3xl font-semibold text-white">
          What website do you want to build?
        </h1>
        <p className="text-sm text-slate-400">
          Describe your website and AI will generate it for you.
        </p>

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 transition focus-within:border-slate-600">
            <input
              ref={inputRef}
              type="text"
              placeholder="e.g. A landing page for a coffee shop in Erbil..."
              disabled={isCreating}
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isCreating}
              className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Start"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
