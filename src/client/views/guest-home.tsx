"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, MessageCircle, Sparkles, X } from "lucide-react";
import { HistoryMessage } from "@/shared/types/database";
import ChatPanel from "@/client/features/chat/chat-panel";
import PreviewPanel from "@/client/features/preview/preview-panel";
import PreviewErrorBoundary from "@/client/features/preview/preview-error-boundary";
import { savePendingGuestZipPrompt } from "@/client/lib/zip-download";
import { savePendingGuestChatSession } from "@/client/lib/guest-chat-handoff";

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

type GuestAIResponse = {
  type: "website" | "questions";
  message: string;
  html?: string;
  error?: string;
};

async function sendGuestChat(
  content: string,
  history: HistoryMessage[]
): Promise<GuestAIResponse> {
  const response = await fetch("/api/guest/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      history: history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : "Something went wrong."
    );
  }

  return data as GuestAIResponse;
}

export default function GuestHomePage() {
  const [messages, setMessages] = useState<HistoryMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [inputErrorMessage, setInputErrorMessage] = useState("");
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [pendingDownloadPrompt, setPendingDownloadPrompt] = useState("");
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");

  const hasPreview = typeof html === "string" && html.trim().length > 0;

  async function handleSend(content: string) {
    if (isSending) return;
    const trimmed = content.trim();
    if (!trimmed) return;

    const userMessage = createGuestMessage("user", trimmed);
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);
    setInputErrorMessage("");

    try {
      const aiResponse = await sendGuestChat(trimmed, messages);

      const assistantMessage = createGuestMessage(
        "assistant",
        aiResponse.message
      );
      setMessages((prev) => [...prev, assistantMessage]);

      if (aiResponse.type === "website" && aiResponse.html) {
        const nextHtml = aiResponse.html.trim();
        if (nextHtml.length > 0) {
          setHtml(aiResponse.html);
        }
      }
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";

      if (raw.includes("Guest limit reached")) {
        setInputErrorMessage(raw);
      } else {
        setInputErrorMessage("Failed to get a response. Please try again.");
      }

      // Remove the optimistic user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsSending(false);
    }
  }

  function openAuthGate(prompt: string) {
    if (!prompt.trim()) return;
    setPendingDownloadPrompt(prompt);
    setAuthGateOpen(true);
  }

  function queueDownloadAndContinue() {
    if (!pendingDownloadPrompt) return;
    savePendingGuestChatSession(messages);
    savePendingGuestZipPrompt(pendingDownloadPrompt);
    setAuthGateOpen(false);
    setPendingDownloadPrompt("");
  }

  function closeAuthGate() {
    setAuthGateOpen(false);
    setPendingDownloadPrompt("");
  }

  function queueChatSessionForAuth() {
    savePendingGuestChatSession(messages);
  }

  // Get the first user message content for the download prompt
  const firstUserMessage = messages.find((m) => m.role === "user");
  const downloadPrompt = firstUserMessage?.content ?? "";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--app-bg)]">
      <header className="border-b border-[var(--app-border)] bg-[var(--app-panel)]/60 px-3 py-3 backdrop-blur sm:px-5 sm:py-4">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <Sparkles size={17} className="prismatic-icon" />
            <p className="prismatic-text text-xs font-semibold uppercase tracking-[0.15em] sm:text-sm sm:tracking-[0.2em]">
              AI Website Builder
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/signin"
              onClick={queueChatSessionForAuth}
              className="rounded-lg border border-[var(--app-card-border)] px-3 py-1.5 text-sm font-medium text-[var(--app-text-secondary)] transition hover:border-[var(--app-text-tertiary)] hover:text-[var(--app-text-heading)]"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              onClick={queueChatSessionForAuth}
              className="rounded-lg bg-[var(--app-btn-primary-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:bg-[var(--app-btn-primary-hover)] hover:-translate-y-px active:translate-y-0"
            >
              Create account
            </Link>
          </div>
        </div>
        <p className="mx-auto mt-1.5 w-full max-w-5xl text-xs text-[var(--app-text-tertiary)] sm:mt-2">
          Guest chats are temporary and not saved to history.
        </p>
      </header>

      {/* Mobile tab bar — visible only on small screens when preview exists */}
      {hasPreview && (
        <div className="flex shrink-0 border-b border-[var(--app-border)] md:hidden">
          <button
            type="button"
            onClick={() => setMobileTab("chat")}
            className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
              mobileTab === "chat"
                ? "border-b-2 border-[var(--app-btn-primary-bg)] text-[var(--app-text-heading)]"
                : "text-[var(--app-text-tertiary)] hover:text-[var(--app-text-secondary)]"
            }`}
          >
            <MessageCircle size={16} />
            Chat
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("preview")}
            className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
              mobileTab === "preview"
                ? "border-b-2 border-[var(--app-btn-primary-bg)] text-[var(--app-text-heading)]"
                : "text-[var(--app-text-tertiary)] hover:text-[var(--app-text-secondary)]"
            }`}
          >
            <Eye size={16} />
            Preview
          </button>
        </div>
      )}

      {/* Desktop: side-by-side layout */}
      <div className="hidden min-h-0 flex-1 md:flex">
        <div className="flex min-w-0 flex-1 flex-col">
          <ChatPanel
            messages={messages}
            onSend={handleSend}
            isSending={isSending}
            currentUserAvatarUrl={null}
            showHeader={false}
            centerInputWhenEmpty={!hasPreview}
            inputPlaceholder="Describe the website you want to build..."
            inputErrorMessage={inputErrorMessage}
          />
        </div>

        {hasPreview && (
          <div
            className="shrink-0 bg-[var(--app-bg-soft)]/90 shadow-[-12px_0_32px_rgba(0,0,0,0.15)]"
            style={{ width: "55%" }}
          >
            <PreviewErrorBoundary>
              <PreviewPanel
                html={html}
                onDownload={() => openAuthGate(downloadPrompt)}
              />
            </PreviewErrorBoundary>
          </div>
        )}
      </div>

      {/* Mobile: tab-switched views */}
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <div className={`min-h-0 flex-1 flex-col ${!hasPreview || mobileTab === "chat" ? "flex" : "hidden"}`}>
          <ChatPanel
            messages={messages}
            onSend={handleSend}
            isSending={isSending}
            currentUserAvatarUrl={null}
            showHeader={false}
            centerInputWhenEmpty={!hasPreview}
            inputPlaceholder="Describe the website you want to build..."
            inputErrorMessage={inputErrorMessage}
          />
        </div>

        {hasPreview && mobileTab === "preview" && (
          <div className="min-h-0 flex-1">
            <PreviewErrorBoundary>
              <PreviewPanel
                html={html}
                onDownload={() => openAuthGate(downloadPrompt)}
              />
            </PreviewErrorBoundary>
          </div>
        )}
      </div>

      {authGateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeAuthGate();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--app-card-border)] bg-[var(--app-panel)] p-6 shadow-[var(--app-shadow-lg)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--app-text-heading)]">
                  Sign in required
                </h3>
                <p className="mt-1 text-sm text-[var(--app-text-secondary)]">
                  Create an account or sign in to download this ZIP package.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAuthGate}
                className="rounded-lg p-2 text-[var(--app-text-tertiary)] transition hover:bg-[var(--app-hover-bg-strong)] hover:text-[var(--app-text-heading)]"
                title="Close dialog"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              <Link
                href="/signin"
                onClick={queueDownloadAndContinue}
                className="rounded-lg border border-[var(--app-card-border)] px-3 py-2.5 text-center text-sm font-medium text-[var(--app-text-secondary)] transition hover:border-[var(--app-text-tertiary)] hover:text-[var(--app-text-heading)]"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                onClick={queueDownloadAndContinue}
                className="rounded-lg bg-[var(--app-btn-primary-bg)] px-3 py-2.5 text-center text-sm font-semibold text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:bg-[var(--app-btn-primary-hover)] hover:-translate-y-px active:translate-y-0"
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
