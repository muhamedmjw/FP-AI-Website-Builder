"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { HistoryMessage } from "@/shared/types/database";
import ChatPanel from "@/client/pages/workspace/chat-panel";

const MAX_GUEST_PROMPTS = 3;

function createGuestMessage(
  role: "user" | "assistant",
  content: string
): HistoryMessage {
  return {
    id: crypto.randomUUID(),
    chat_id: "guest-session",
    role,
    content,
    created_at: new Date().toISOString(),
  };
}

function buildGuestAssistantReply(content: string): string {
  return "Thanks! This chat is temporary and not saved. You said: " + content;
}

export default function GuestHomePage() {
  const [messages, setMessages] = useState<HistoryMessage[]>([]);
  const [promptsUsed, setPromptsUsed] = useState(0);
  const [isSending, setIsSending] = useState(false);

  const promptsRemaining = MAX_GUEST_PROMPTS - promptsUsed;
  const hasReachedLimit = promptsRemaining <= 0;

  async function handleSend(content: string) {
    if (isSending || hasReachedLimit) {
      return;
    }

    setIsSending(true);

    const userMessage = createGuestMessage("user", content);
    const assistantMessage = createGuestMessage(
      "assistant",
      buildGuestAssistantReply(content)
    );

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setPromptsUsed((prev) => prev + 1);
    setIsSending(false);
  }

  return (
    <div className="flex h-full min-h-screen flex-col bg-[var(--app-bg)]">
      <header className="border-b border-white/[0.08] bg-black/15 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles size={17} className="prismatic-icon" />
            <p className="prismatic-text text-sm font-semibold uppercase tracking-[0.2em]">
              AI Website Builder
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-neutral-300">
              {promptsRemaining}/{MAX_GUEST_PROMPTS} prompts left
            </span>
            <Link
              href="/signin"
              className="rounded-lg border border-white/[0.14] px-3 py-1.5 text-sm font-medium text-neutral-200 transition hover:border-white/[0.28] hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rainbow-hover prismatic-shadow rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
            >
              Create account
            </Link>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <ChatPanel
          messages={messages}
          onSend={handleSend}
          isSending={isSending}
          currentUserAvatarUrl={null}
          disableInput={hasReachedLimit}
          showHeader={false}
          centerInputWhenEmpty
          inputPlaceholder={
            hasReachedLimit
              ? "Guest limit reached (3 prompts). Sign in to continue."
              : "Describe the website you want to build..."
          }
        />
      </div>
    </div>
  );
}
