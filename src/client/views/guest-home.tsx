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
import LanguageSwitcher from "@/client/components/ui/language-switcher";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";
import { localizeGuestChatErrorMessage } from "@/shared/utils/localized-errors";
import { MAX_GUEST_PROMPTS } from "@/shared/constants/limits";
import type { AppLanguage } from "@/shared/types/database";

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
  history: HistoryMessage[],
  language: AppLanguage
): Promise<GuestAIResponse> {
  const response = await fetch("/api/guest/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      language,
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

function GuestLimitBanner({
  language,
  queueChatSessionForAuth,
}: {
  language: AppLanguage;
  queueChatSessionForAuth: () => void;
}) {
  return (
    <div className="mx-auto mb-2 w-full max-w-4xl rounded-2xl border border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-4">
      <h3 className="font-semibold text-[var(--app-text-heading)]">
        You&apos;ve used your 3 free prompts
      </h3>
      <p className="mt-1 text-sm text-[var(--app-text-secondary)]">
        Create a free account to keep building - no credit card required.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Link
          href="/signin"
          onClick={queueChatSessionForAuth}
          className="rounded-lg border border-[var(--app-card-border)] px-3 py-2.5 text-center text-sm font-medium text-[var(--app-text-secondary)] transition hover:border-[var(--app-text-tertiary)] hover:text-[var(--app-text-heading)]"
        >
          {t("signIn", language)}
        </Link>
        <Link
          href="/signup"
          onClick={queueChatSessionForAuth}
          className="rounded-lg bg-[var(--app-btn-primary-bg)] px-3 py-2.5 text-center text-sm font-semibold text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:bg-[var(--app-btn-primary-hover)] hover:-translate-y-px active:translate-y-0"
        >
          {t("signUp", language)}
        </Link>
      </div>
    </div>
  );
}

export default function GuestHomePage() {
  const { language } = useLanguage();
  const [messages, setMessages] = useState<HistoryMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendingStartedAtMs, setSendingStartedAtMs] = useState<number | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [inputErrorMessage, setInputErrorMessage] = useState("");
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [pendingDownloadPrompt, setPendingDownloadPrompt] = useState("");
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");
  const [promptsUsed, setPromptsUsed] = useState(0);

  const hasPreview = typeof html === "string" && html.trim().length > 0;
  const hasLimitErrorMessage =
    inputErrorMessage === t("guestLimitReached", language) ||
    inputErrorMessage.toLowerCase().includes("limit");
  const isLimitReached = promptsUsed >= MAX_GUEST_PROMPTS;
  const displayedInputError = hasLimitErrorMessage ? "" : inputErrorMessage;
  const guestInputPlaceholder = isSending
    ? t("generating", language)
    : t("inputPlaceholder", language);
  const shouldShowGeneratingIndicator =
    isSending && messages.some((message) => message.role === "user");

  async function handleSend(content: string) {
    if (isSending) return;
    const trimmed = content.trim();
    if (!trimmed) return;

    const userMessage = createGuestMessage("user", trimmed);
    setMessages((prev) => [...prev, userMessage]);
    setSendingStartedAtMs(Date.now());
    setIsSending(true);
    setInputErrorMessage("");

    try {
      const aiResponse = await sendGuestChat(trimmed, messages, language);

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

      setPromptsUsed((previousCount) =>
        Math.min(previousCount + 1, MAX_GUEST_PROMPTS)
      );
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      setInputErrorMessage(localizeGuestChatErrorMessage(raw, language));

      if (raw.includes("429") || raw.toLowerCase().includes("limit")) {
        setPromptsUsed(MAX_GUEST_PROMPTS);
      }

      // Remove the optimistic user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsSending(false);
      setSendingStartedAtMs(null);
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
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex items-start justify-between gap-2 sm:items-center sm:gap-3">
            <Link
              href="/"
              className="flex min-w-0 max-w-[48%] items-start gap-2 transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:max-w-none sm:items-center sm:gap-3"
              aria-label="Go to home"
            >
              <Sparkles size={20} strokeWidth={1.8} className="mt-0.5 shrink-0 prismatic-icon sm:mt-0" />
              <p className="prismatic-text whitespace-normal wrap-break-word text-[0.72rem] font-semibold uppercase leading-[1.15] tracking-[0.14em] sm:text-base sm:tracking-[0.24em]">
                <span style={{ fontFamily: "var(--font-logo)" }}>AI Website Builder</span>
              </p>
            </Link>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <div className="sm:hidden">
                <LanguageSwitcher iconOnly />
              </div>
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>
              <Link
                href="/signin"
                onClick={queueChatSessionForAuth}
                className="rounded-lg border border-[var(--app-card-border)] px-2 py-1 text-xs font-medium text-[var(--app-text-secondary)] transition hover:border-[var(--app-text-tertiary)] hover:text-[var(--app-text-heading)] sm:px-3 sm:py-1.5 sm:text-sm"
              >
                {t("signIn", language)}
              </Link>
              <Link
                href="/signup"
                onClick={queueChatSessionForAuth}
                className="rounded-lg bg-[var(--app-btn-primary-bg)] px-2 py-1 text-xs font-semibold text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:bg-[var(--app-btn-primary-hover)] hover:-translate-y-px active:translate-y-0 sm:px-3 sm:py-1.5 sm:text-sm"
              >
                {t("signUp", language)}
              </Link>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-1.5 w-full max-w-5xl text-xs text-[var(--app-text-tertiary)] sm:mt-2">
          {t("guestNotice", language)}
        </p>
      </header>

      {/* Mobile tab bar */}
      <div
        className={`flex shrink-0 border-b border-[var(--app-border)] md:hidden overflow-hidden transition-all duration-300 ${
          hasPreview ? "max-h-12 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
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
            {t("chat", language)}
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
            {t("preview", language)}
          </button>
      </div>

      {/* Desktop: side-by-side layout */}
      <div className="hidden min-h-0 flex-1 md:flex">
        <div className="flex min-w-0 flex-1 flex-col">
          <ChatPanel
            messages={messages}
            onSend={handleSend}
            isSending={shouldShowGeneratingIndicator}
            sendingStartedAtMs={sendingStartedAtMs}
            currentUserAvatarUrl={null}
            showHeader={false}
            centerInputWhenEmpty={!hasPreview}
            inputPlaceholder={guestInputPlaceholder}
            inputErrorMessage={displayedInputError}
            inputBanner={
              isLimitReached ? (
                <GuestLimitBanner
                  language={language}
                  queueChatSessionForAuth={queueChatSessionForAuth}
                />
              ) : null
            }
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
            isSending={shouldShowGeneratingIndicator}
            sendingStartedAtMs={sendingStartedAtMs}
            currentUserAvatarUrl={null}
            showHeader={false}
            centerInputWhenEmpty={!hasPreview}
            inputPlaceholder={guestInputPlaceholder}
            inputErrorMessage={displayedInputError}
            inputBanner={
              isLimitReached ? (
                <GuestLimitBanner
                  language={language}
                  queueChatSessionForAuth={queueChatSessionForAuth}
                />
              ) : null
            }
            emptyStateMobileTuning
            pinDisclaimerToBottomOnMobile
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
                {t("signIn", language)}
              </Link>
              <Link
                href="/signup"
                onClick={queueDownloadAndContinue}
                className="rounded-lg bg-[var(--app-btn-primary-bg)] px-3 py-2.5 text-center text-sm font-semibold text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:bg-[var(--app-btn-primary-hover)] hover:-translate-y-px active:translate-y-0"
              >
                {t("signUp", language)}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
