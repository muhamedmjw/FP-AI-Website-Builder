"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { HistoryMessage } from "@/shared/types/database";
import ChatPanel from "@/client/features/chat/chat-panel";
import { savePendingGuestChatSession } from "@/client/lib/guest-chat-handoff";
import LanguageSwitcher from "@/client/components/ui/language-switcher";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";
import { localizeGuestChatErrorMessage } from "@/shared/utils/localized-errors";
import { MAX_GUEST_PROMPTS } from "@/shared/constants/limits";
import type { AppLanguage } from "@/shared/types/database";

const GUEST_WEBSITE_WINDOW_MS = 12 * 60 * 60 * 1000;
const GUEST_SESSION_STORAGE_KEY = "guest_mode_session_v1";

type PersistedGuestSession = {
  messages: HistoryMessage[];
  html: string | null;
  promptsUsed: number;
  websiteWindowExpiresAtMs: number | null;
};

function normalizeGuestMessages(value: unknown): HistoryMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is HistoryMessage => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const message = item as Partial<HistoryMessage>;
      return (
        typeof message.id === "string" &&
        typeof message.chat_id === "string" &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        typeof message.created_at === "string"
      );
    })
    .map((message) => ({
      ...message,
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0);
}

function clearPersistedGuestSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
}

function loadInitialGuestSession(): PersistedGuestSession {
  const emptyState: PersistedGuestSession = {
    messages: [],
    html: null,
    promptsUsed: 0,
    websiteWindowExpiresAtMs: null,
  };

  if (typeof window === "undefined") {
    return emptyState;
  }

  try {
    const raw = window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY);
    if (!raw) {
      return emptyState;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedGuestSession>;
    const messages = normalizeGuestMessages(parsed.messages);
    const html = typeof parsed.html === "string" && parsed.html.trim().length > 0
      ? parsed.html
      : null;
    const promptsUsed =
      typeof parsed.promptsUsed === "number" && Number.isFinite(parsed.promptsUsed)
        ? Math.max(0, Math.min(MAX_GUEST_PROMPTS, Math.floor(parsed.promptsUsed)))
        : 0;
    const websiteWindowExpiresAtMs =
      typeof parsed.websiteWindowExpiresAtMs === "number" &&
      Number.isFinite(parsed.websiteWindowExpiresAtMs)
        ? parsed.websiteWindowExpiresAtMs
        : null;

    if (
      websiteWindowExpiresAtMs !== null &&
      Date.now() >= websiteWindowExpiresAtMs
    ) {
      clearPersistedGuestSession();
      return emptyState;
    }

    return {
      messages,
      html,
      promptsUsed,
      websiteWindowExpiresAtMs,
    };
  } catch {
    clearPersistedGuestSession();
    return emptyState;
  }
}

function formatRemainingWindow(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

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
  const initialSession = useMemo(loadInitialGuestSession, []);
  const [messages, setMessages] = useState<HistoryMessage[]>(initialSession.messages);
  const [isSending, setIsSending] = useState(false);
  const [sendingStartedAtMs, setSendingStartedAtMs] = useState<number | null>(null);
  const [html, setHtml] = useState<string | null>(initialSession.html);
  const [inputErrorMessage, setInputErrorMessage] = useState("");
  const [previewGateOpen, setPreviewGateOpen] = useState(false);
  const [promptsUsed, setPromptsUsed] = useState(initialSession.promptsUsed);
  const [websiteWindowExpiresAtMs, setWebsiteWindowExpiresAtMs] = useState<number | null>(
    initialSession.websiteWindowExpiresAtMs
  );
  const [windowClockNowMs, setWindowClockNowMs] = useState<number>(Date.now());

  const hasPreview = typeof html === "string" && html.trim().length > 0;
  const hasLimitErrorMessage =
    inputErrorMessage === t("guestLimitReached", language) ||
    inputErrorMessage.toLowerCase().includes("limit");
  const isWebsiteWindowActive =
    websiteWindowExpiresAtMs !== null && windowClockNowMs < websiteWindowExpiresAtMs;
  const websiteWindowRemainingMs =
    websiteWindowExpiresAtMs !== null
      ? Math.max(0, websiteWindowExpiresAtMs - windowClockNowMs)
      : 0;
  const isLimitReached = promptsUsed >= MAX_GUEST_PROMPTS;
  const isGuestInputLocked = isLimitReached || isWebsiteWindowActive;
  const displayedInputError = hasLimitErrorMessage ? "" : inputErrorMessage;
  const guestInputPlaceholder = isSending
    ? t("generating", language)
    : isWebsiteWindowActive
      ? `Next guest reset in ${formatRemainingWindow(websiteWindowRemainingMs)}`
      : t("inputPlaceholder", language);
  const shouldShowGeneratingIndicator =
    isSending && messages.some((message) => message.role === "user");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (
      messages.length === 0 &&
      !html &&
      promptsUsed === 0 &&
      websiteWindowExpiresAtMs === null
    ) {
      clearPersistedGuestSession();
      return;
    }

    const payload: PersistedGuestSession = {
      messages,
      html,
      promptsUsed,
      websiteWindowExpiresAtMs,
    };

    window.localStorage.setItem(GUEST_SESSION_STORAGE_KEY, JSON.stringify(payload));
  }, [messages, html, promptsUsed, websiteWindowExpiresAtMs]);

  useEffect(() => {
    if (websiteWindowExpiresAtMs === null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const now = Date.now();
      setWindowClockNowMs(now);

      if (now < websiteWindowExpiresAtMs) {
        return;
      }

      window.clearInterval(intervalId);
      clearPersistedGuestSession();
      setMessages([]);
      setHtml(null);
      setPromptsUsed(0);
      setWebsiteWindowExpiresAtMs(null);
      setPreviewGateOpen(false);
      setInputErrorMessage("");
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [websiteWindowExpiresAtMs]);

  async function handleSend(content: string) {
    if (isSending || isGuestInputLocked) return;
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
          setWebsiteWindowExpiresAtMs((previousValue) => {
            if (previousValue && previousValue > Date.now()) {
              return previousValue;
            }

            return Date.now() + GUEST_WEBSITE_WINDOW_MS;
          });
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

  function queueChatSessionForAuth() {
    savePendingGuestChatSession(messages);
  }

  function handlePreviewRequest() {
    if (!hasPreview) {
      return;
    }

    setPreviewGateOpen(true);
  }

  function closePreviewGate() {
    setPreviewGateOpen(false);
  }

  const shouldShowWindowLockBanner = isWebsiteWindowActive;

  const windowLockBanner = shouldShowWindowLockBanner ? (
    <div className="mx-auto mb-2 w-full max-w-4xl rounded-2xl border border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-4">
      <h3 className="font-semibold text-[var(--app-text-heading)]">
        Guest website saved for 12 hours
      </h3>
      <p className="mt-1 text-sm text-[var(--app-text-secondary)]">
        Your generated website is kept for {formatRemainingWindow(websiteWindowRemainingMs)}. Sign in to continue building now, or wait for the guest reset.
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
  ) : null;

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

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <ChatPanel
            messages={messages}
            onSend={handleSend}
            onPreviewRequest={handlePreviewRequest}
            showPreviewGateButton
            hasPreview={hasPreview}
            isSending={shouldShowGeneratingIndicator}
            sendingStartedAtMs={sendingStartedAtMs}
            currentUserAvatarUrl={null}
            showHeader={false}
            centerInputWhenEmpty
            inputPlaceholder={guestInputPlaceholder}
            inputErrorMessage={displayedInputError}
            disableInput={isGuestInputLocked}
            inputBanner={
              shouldShowWindowLockBanner
                ? windowLockBanner
                : isLimitReached ? (
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
      </div>

      {previewGateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closePreviewGate();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--app-card-border)] bg-[var(--app-panel)] p-6 shadow-[var(--app-shadow-lg)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--app-text-heading)]">
                  {t("previewGateTitle", language)}
                </h3>
                <p className="mt-1 text-sm text-[var(--app-text-secondary)]">
                  {t("previewGateDesc", language)}
                </p>
              </div>
              <button
                type="button"
                onClick={closePreviewGate}
                className="rounded-lg p-2 text-[var(--app-text-tertiary)] transition hover:bg-[var(--app-hover-bg-strong)] hover:text-[var(--app-text-heading)]"
                title={t("close", language)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              <Link
                href="/signin"
                onClick={() => {
                  queueChatSessionForAuth();
                  closePreviewGate();
                }}
                className="rounded-lg border border-[var(--app-card-border)] px-3 py-2.5 text-center text-sm font-medium text-[var(--app-text-secondary)] transition hover:border-[var(--app-text-tertiary)] hover:text-[var(--app-text-heading)]"
              >
                {t("signIn", language)}
              </Link>
              <Link
                href="/signup"
                onClick={() => {
                  queueChatSessionForAuth();
                  closePreviewGate();
                }}
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
