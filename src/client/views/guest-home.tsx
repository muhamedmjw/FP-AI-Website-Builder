"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles, X, Clock } from "lucide-react";
import { HistoryMessage } from "@/shared/types/database";
import ChatPanel from "@/client/features/chat/chat-panel";
import { savePendingGuestChatSession } from "@/client/lib/guest-chat-handoff";
import LanguageSwitcher from "@/client/components/ui/language-switcher";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";
import { localizeGuestChatErrorMessage } from "@/shared/utils/localized-errors";
import { MAX_GUEST_PROMPTS } from "@/shared/constants/limits";
import { getDisplayModelName, PRIMARY_MODEL } from "@/shared/constants/ai";
import { useCountdown, formatCountdown } from "@/client/lib/hooks/use-countdown";
import type { AppLanguage } from "@/shared/types/database";

type GuestUsageResponse = {
  promptsUsed: number;
  promptsRemaining: number;
  maxPrompts: number;
  limitReached: boolean;
  resetsAt: string;
  msUntilReset: number;
};

async function fetchGuestUsage(): Promise<GuestUsageResponse | null> {
  try {
    const response = await fetch("/api/guest/usage");
    if (!response.ok) return null;
    return (await response.json()) as GuestUsageResponse;
  } catch {
    return null;
  }
}

/**
 * GUEST STATE ARCHITECTURE NOTE
 *
 * Guest state is currently split across three systems:
 * 1. localStorage key "pending_guest_chat_session" (guest-chat-handoff.ts) — stores messages + HTML
 *    for handoff when a guest signs up.
 * 2. localStorage key "guest_mode_session_v1" (this file) — stores the active
 *    guest session during the chat itself.
 * 3. Cookie "guest_token" + database table "guest_usage" — tracks rate limit identity.
 *
 * These two localStorage keys serve different purposes and should not be merged
 * without careful testing of the sign-up handoff flow.
 *
 * Future improvement: consolidate guest session state into a single localStorage
 * key with a clear schema, and derive the handoff payload from it at sign-up time.
 */
const GUEST_SESSION_STORAGE_KEY = "guest_mode_session_v1";

type PersistedGuestSession = {
  sessionId: string;
  messages: HistoryMessage[];
  html: string | null;
  websiteGenerated: boolean;
  promptsUsed: number;
  resetsAt: string | null;
};

function createGuestSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

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
    sessionId: createGuestSessionId(),
    messages: [],
    html: null,
    websiteGenerated: false,
    promptsUsed: 0,
    resetsAt: null,
  };

  if (typeof window === "undefined") {
    return emptyState;
  }

  try {
    const raw = window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY);
    if (!raw) {
      return emptyState;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedGuestSession> & {
      websiteWindowExpiresAtMs?: unknown;
    };
    const sessionId =
      typeof parsed.sessionId === "string" && parsed.sessionId.trim().length > 0
        ? parsed.sessionId.trim()
        : createGuestSessionId();
    const messages = normalizeGuestMessages(parsed.messages);
    const html =
      typeof parsed.html === "string" && parsed.html.trim().length > 0
        ? parsed.html
        : null;
    const promptsUsed =
      typeof parsed.promptsUsed === "number" && Number.isFinite(parsed.promptsUsed)
        ? Math.max(0, Math.min(MAX_GUEST_PROMPTS, Math.floor(parsed.promptsUsed)))
        : 0;
    const websiteGenerated =
      typeof parsed.websiteGenerated === "boolean"
        ? parsed.websiteGenerated
        : html !== null;
    const resetsAt =
      typeof parsed.resetsAt === "string" ? parsed.resetsAt : null;

    return {
      sessionId,
      messages,
      html,
      websiteGenerated,
      promptsUsed,
      resetsAt,
    };
  } catch {
    clearPersistedGuestSession();
    return emptyState;
  }
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
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({ role: message.role, content: message.content })),
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
  resetsAt,
  onExpired,
}: {
  language: AppLanguage;
  queueChatSessionForAuth: () => void;
  resetsAt: string | null;
  onExpired?: () => void;
}) {
  const resetTimestamp = resetsAt ? new Date(resetsAt).getTime() : null;
  const { hours, minutes, seconds, isExpired } = useCountdown(resetTimestamp);

  // Call onExpired callback when timer expires
  useEffect(() => {
    if (isExpired && onExpired) {
      onExpired();
    }
  }, [isExpired, onExpired]);

  const timerText = isExpired
    ? t("guestLimitReset", language)
    : t("guestLimitTimer", language).replace(
        "{time}",
        formatCountdown(hours, minutes, seconds, language)
      );

  return (
    <div className="mx-auto mb-2 w-full max-w-4xl rounded-2xl border border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-4">
      <h3 className="font-semibold text-[var(--app-text-heading)]">
        {t("guestLimitTitle", language)}
      </h3>
      <p className="mt-1 text-sm text-[var(--app-text-secondary)]">
        {t("guestLimitDesc", language)}
      </p>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--app-text-tertiary)]">
        <Clock size={12} />
        <span>{timerText}</span>
      </div>
      {isExpired && (
        <button
          onClick={onExpired}
          className="mt-2 text-xs text-[var(--app-text-secondary)] underline hover:text-[var(--app-text-heading)]"
        >
          {t("guestCheckForReset", language)}
        </button>
      )}
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

function GuestWebsiteReadyBanner({
  language,
  queueChatSessionForAuth,
}: {
  language: AppLanguage;
  queueChatSessionForAuth: () => void;
}) {
  return (
    <div className="mx-auto mb-2 w-[calc(100%-1rem)] max-w-md rounded-xl border border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-3 sm:w-full sm:max-w-4xl sm:rounded-2xl sm:p-4">
      <h3 className="text-sm font-semibold text-[var(--app-text-heading)] sm:text-base">
        {t("guestWebsiteReadyTitle", language)}
      </h3>
      <p className="mt-1 text-xs text-[var(--app-text-secondary)] sm:text-sm">
        {t("guestWebsiteReadyDesc", language)}
      </p>
      <div className="mt-2.5 grid gap-2 sm:mt-3 sm:grid-cols-2">
        <Link
          href="/signin"
          onClick={queueChatSessionForAuth}
          className="rounded-lg border border-[var(--app-card-border)] px-3 py-2 text-center text-sm font-medium text-[var(--app-text-secondary)] transition hover:border-[var(--app-text-tertiary)] hover:text-[var(--app-text-heading)] sm:py-2.5"
        >
          {t("signIn", language)}
        </Link>
        <Link
          href="/signup"
          onClick={queueChatSessionForAuth}
          className="rounded-lg bg-[var(--app-btn-primary-bg)] px-3 py-2 text-center text-sm font-semibold text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:bg-[var(--app-btn-primary-hover)] hover:-translate-y-px active:translate-y-0 sm:py-2.5"
        >
          {t("signUp", language)}
        </Link>
      </div>
    </div>
  );
}

export default function GuestHomePage() {
  const { language } = useLanguage();
  const shouldWrapBrandOnMobile = language === "en" || language === "ar";
  const providerName = getDisplayModelName(PRIMARY_MODEL);
  const [messages, setMessages] = useState<HistoryMessage[]>([]);
  const [guestSessionId, setGuestSessionId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendingStartedAtMs, setSendingStartedAtMs] = useState<number | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [websiteGenerated, setWebsiteGenerated] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [inputErrorMessage, setInputErrorMessage] = useState("");
  const [promptsUsed, setPromptsUsed] = useState(0);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [resetsAt, setResetsAt] = useState<string | null>(null);

  const hasPreview = typeof html === "string" && html.trim().length > 0;
  const hasLimitErrorMessage =
    inputErrorMessage === t("guestLimitReached", language) ||
    inputErrorMessage.toLowerCase().includes("limit");
  const isLimitReached = promptsUsed >= MAX_GUEST_PROMPTS;
  const isGuestInputLocked = websiteGenerated || isLimitReached;
  const displayedInputError = hasLimitErrorMessage ? "" : inputErrorMessage;
  const guestInputPlaceholder = isSending
    ? t("generating", language)
    : t("inputPlaceholder", language);
  const shouldShowGeneratingIndicator =
    isSending && messages.some((message) => message.role === "user");

  useEffect(() => {
    const initialSession = loadInitialGuestSession();
    setGuestSessionId(initialSession.sessionId);
    setMessages(initialSession.messages);
    setHtml(initialSession.html);
    setWebsiteGenerated(initialSession.websiteGenerated);
    setPromptsUsed(initialSession.promptsUsed);
    setResetsAt(initialSession.resetsAt);
    setSessionHydrated(true);
  }, []);

  useEffect(() => {
    // Fetch guest usage data to get reset time
    fetchGuestUsage().then((usage) => {
      if (usage) {
        // Always update resetsAt from server
        setResetsAt(usage.resetsAt);
        
        // Sync prompts used from server
        // Update if server has higher count OR if window expired (server shows 0 but local shows > 0)
        if (usage.promptsUsed !== promptsUsed) {
          setPromptsUsed(usage.promptsUsed);
        }
      }
    });
  }, []);

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (!sessionHydrated) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const payload: PersistedGuestSession = {
      sessionId: guestSessionId || createGuestSessionId(),
      messages,
      html,
      websiteGenerated,
      promptsUsed,
      resetsAt,
    };

    window.localStorage.setItem(GUEST_SESSION_STORAGE_KEY, JSON.stringify(payload));
  }, [guestSessionId, messages, html, websiteGenerated, promptsUsed, resetsAt, sessionHydrated]);

  useEffect(() => {
    if (!previewOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [previewOpen]);

  async function handleSend(content: string) {
    if (isSending || isGuestInputLocked || isLimitReached) return;

    const trimmed = content.trim();
    if (!trimmed) return;

    const userMessage = createGuestMessage("user", trimmed);
    setMessages((previousMessages) => [...previousMessages, userMessage]);
    setSendingStartedAtMs(Date.now());
    setIsSending(true);
    setInputErrorMessage("");

    try {
      const aiResponse = await sendGuestChat(trimmed, messages, language);

      const assistantMessage = createGuestMessage("assistant", aiResponse.message);
      setMessages((previousMessages) => [...previousMessages, assistantMessage]);

      if (aiResponse.type === "website") {
        const nextHtml =
          typeof aiResponse.html === "string" ? aiResponse.html.trim() : "";

        if (nextHtml.length > 0) {
          setHtml(aiResponse.html ?? null);
        }

        setWebsiteGenerated(true);
      }

      setPromptsUsed((previousCount) =>
        Math.min(previousCount + 1, MAX_GUEST_PROMPTS)
      );
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "";
      setInputErrorMessage(localizeGuestChatErrorMessage(rawMessage, language));

      if (rawMessage.includes("429") || rawMessage.toLowerCase().includes("limit")) {
        setPromptsUsed(MAX_GUEST_PROMPTS);
      }

      setMessages((previousMessages) =>
        previousMessages.filter((message) => message.id !== userMessage.id)
      );
    } finally {
      setIsSending(false);
      setSendingStartedAtMs(null);
    }
  }

  function queueChatSessionForAuth() {
    savePendingGuestChatSession(messages, {
      sessionId: guestSessionId,
      html,
      websiteGenerated,
    });
  }

  function handlePreviewRequest() {
    if (!hasPreview) {
      return;
    }

    setPreviewOpen(true);
  }

  function closePreview() {
    setPreviewOpen(false);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--app-bg)]">
      <header className="relative z-50 border-b border-[var(--app-border)] bg-[var(--app-panel)]/60 px-3 py-3 backdrop-blur sm:px-5 sm:py-4">
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex items-start justify-between gap-2 sm:items-center sm:gap-3">
            <Link
              href="/"
              className="flex min-w-0 max-w-[48%] items-start gap-2 transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:max-w-none sm:items-center sm:gap-3"
              aria-label="Go to home"
            >
              <Sparkles size={20} strokeWidth={1.8} className="mt-0.5 shrink-0 prismatic-icon sm:mt-0" />
              <p className="prismatic-text whitespace-normal wrap-break-word text-[0.72rem] font-semibold uppercase leading-[1.15] tracking-[0.14em] sm:text-base sm:tracking-[0.24em]">
                <span style={{ fontFamily: "var(--font-ui)", fontWeight: 700, letterSpacing: "0.15em" }}>
                  {shouldWrapBrandOnMobile ? (
                    <>
                      <span className="block sm:inline">AI Website</span>
                      <span className="block sm:inline sm:ml-1">Builder</span>
                    </>
                  ) : (
                    "AI Website Builder"
                  )}
                </span>
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
                className="rounded-lg border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-2 py-2 text-xs font-medium text-[var(--app-text-secondary)] transition hover:border-[var(--app-text-tertiary)] hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)] sm:px-3 sm:py-2 sm:text-sm"
              >
                {t("signIn", language)}
              </Link>
              <Link
                href="/signup"
                onClick={queueChatSessionForAuth}
                className="rounded-lg bg-[var(--app-btn-primary-bg)] px-2 py-2 text-xs font-semibold text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:bg-[var(--app-btn-primary-hover)] hover:-translate-y-px active:translate-y-0 sm:px-3 sm:py-2 sm:text-sm"
              >
                {t("signUp", language)}
              </Link>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-1.5 flex w-full max-w-5xl items-center justify-between text-xs text-[var(--app-text-tertiary)] sm:mt-2">
          <span>{t("guestNotice", language)}</span>
          <span className="rounded-full border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-2 py-0.5 text-[10px] sm:text-xs">
            {t("guestPromptsRemaining", language)
              .replace("{used}", String(promptsUsed))
              .replace("{max}", String(MAX_GUEST_PROMPTS))}
          </span>
        </div>
        <p className="mx-auto mt-1 w-full max-w-5xl text-[10px] text-[var(--app-text-tertiary)] sm:text-xs">
          {t("aiModelLabel", language).replace("{model}", providerName)}
        </p>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <ChatPanel
            messages={messages}
            onSend={handleSend}
            onPreviewRequest={handlePreviewRequest}
            showPreviewGateButton
            previewOpen={previewOpen}
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
              websiteGenerated ? (
                <GuestWebsiteReadyBanner
                  language={language}
                  queueChatSessionForAuth={queueChatSessionForAuth}
                />
              ) : isLimitReached ? (
                <GuestLimitBanner
                  language={language}
                  queueChatSessionForAuth={queueChatSessionForAuth}
                  resetsAt={resetsAt}
                  onExpired={() => {
                    // Refresh usage from server when timer expires
                    fetchGuestUsage().then((usage) => {
                      if (usage) {
                        setResetsAt(usage.resetsAt);
                        setPromptsUsed(usage.promptsUsed);
                        // Clear chat history and session when window resets
                        if (usage.promptsUsed === 0) {
                          setMessages([]);
                          setHtml(null);
                          setWebsiteGenerated(false);
                        }
                      }
                    });
                  }}
                />
              ) : null
            }
            emptyStateMobileTuning
            pinDisclaimerToBottomOnMobile
            showInputDisclaimer={false}
          />
        </div>
      </div>

      {previewOpen && hasPreview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closePreview();
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-[calc(100%-1rem)] max-w-md rounded-2xl border border-[var(--app-card-border)] bg-[var(--app-panel)] p-4 shadow-[var(--app-shadow-lg)] sm:w-full sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-[var(--app-text-heading)]">
                  {t("previewGateTitle", language)}
                </h3>
                <p className="mt-1 text-sm text-[var(--app-text-secondary)]">
                  {t("previewGateDesc", language)}
                </p>
              </div>
              <button
                type="button"
                onClick={closePreview}
                className="rounded-lg p-2 text-[var(--app-text-tertiary)] transition hover:bg-[var(--app-hover-bg-strong)] hover:text-[var(--app-text-heading)]"
                title={t("close", language)}
                aria-label={t("close", language)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link
                href="/signin"
                onClick={() => {
                  queueChatSessionForAuth();
                  closePreview();
                }}
                className="rounded-lg border border-[var(--app-card-border)] px-3 py-2.5 text-center text-sm font-medium text-[var(--app-text-secondary)] transition hover:border-[var(--app-text-tertiary)] hover:text-[var(--app-text-heading)]"
              >
                {t("signIn", language)}
              </Link>
              <Link
                href="/signup"
                onClick={() => {
                  queueChatSessionForAuth();
                  closePreview();
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
