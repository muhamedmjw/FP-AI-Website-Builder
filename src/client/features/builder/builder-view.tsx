"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, MessageCircle } from "lucide-react";
import { HistoryMessage } from "@/shared/types/database";
import { sendChatMessage } from "@/client/lib/api/chat-api";
import { downloadWebsiteZip } from "@/client/lib/zip-download";
import { useMobileHeaderTitle } from "@/client/components/mobile-header-title-context";
import ChatPanel from "@/client/features/chat/chat-panel";
import PromptSuggestions from "@/client/features/chat/prompt-suggestions";
import PreviewPanel from "@/client/features/preview/preview-panel";
import PreviewErrorBoundary from "@/client/features/preview/preview-error-boundary";
import ResizeHandle from "@/client/features/builder/resize-handle";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";

/**
 * Builder view - main split layout.
 * Chat is always visible; preview appears only when generated HTML exists.
 * On mobile, a tab bar switches between Chat and Preview.
 */

type BuilderViewProps = {
  chatId: string;
  chatTitle?: string;
  initialMessages: HistoryMessage[];
  initialHtml: string | null;
  initialIsPublic?: boolean;
  isAuthenticated?: boolean;
  currentUserAvatarUrl?: string | null;
};

/** Minimum preview width in pixels */
const MIN_PREVIEW_WIDTH = 200;
/** Default preview width as a fraction of the container (0-1) */
const DEFAULT_PREVIEW_FRACTION = 0.55;

export default function BuilderView({
  chatId,
  chatTitle = "Untitled",
  initialMessages,
  initialHtml,
  initialIsPublic = false,
  isAuthenticated = true,
  currentUserAvatarUrl = null,
}: BuilderViewProps) {
  const { language } = useLanguage();
  const hasInitialPreview =
    typeof initialHtml === "string" && initialHtml.trim().length > 0;

  const { setTitle } = useMobileHeaderTitle();
  const containerRef = useRef<HTMLDivElement>(null);

  // Set mobile header title to chat title
  useEffect(() => {
    setTitle(chatTitle);
    return () => setTitle("");
  }, [chatTitle, setTitle]);

  const [messages, setMessages] = useState<HistoryMessage[]>(initialMessages);
  const [html, setHtml] = useState<string | null>(initialHtml);
  const [isSending, setIsSending] = useState(false);
  const [inputErrorMessage, setInputErrorMessage] = useState("");

  // Preview panel state
  const [previewOpen, setPreviewOpen] = useState(hasInitialPreview);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const hasPreview = typeof html === "string" && html.trim().length > 0;

  // Mobile tab state: "chat" | "preview"
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");

  useEffect(() => {
    if (!hasPreview) {
      setMobileTab("chat");
    }
  }, [hasPreview]);

  // Initialise preview width lazily from container width
  const getInitialWidth = useCallback((containerWidth: number) => {
    return Math.round(containerWidth * DEFAULT_PREVIEW_FRACTION);
  }, []);

  const handleResize = useCallback(
    (deltaX: number) => {
      setIsResizing(true);
      setPreviewWidth((prev) => {
        const container = containerRef.current;
        if (!container) return prev;

        const containerWidth = container.offsetWidth;
        const current = prev ?? getInitialWidth(containerWidth);

        // Moving handle right shrinks preview; left grows preview.
        const next = current - deltaX;

        // Keep enough width for chat.
        const reservedWidth = 300;
        const maxPreview = containerWidth - reservedWidth;
        return Math.max(MIN_PREVIEW_WIDTH, Math.min(next, maxPreview));
      });
    },
    [getInitialWidth]
  );

  useEffect(() => {
    if (!previewOpen) return;

    setPreviewWidth((prev) => {
      const container = containerRef.current;
      if (!container) return prev;

      const containerWidth = container.offsetWidth;
      const current = prev ?? getInitialWidth(containerWidth);
      const reservedWidth = 300;
      const maxPreview = containerWidth - reservedWidth;

      return Math.max(MIN_PREVIEW_WIDTH, Math.min(current, maxPreview));
    });
  }, [previewOpen, getInitialWidth]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(
    initialIsPublic ? `/preview/${chatId}` : null
  );
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [deployError, setDeployError] = useState("");
  const [hasDeployed, setHasDeployed] = useState(false);

  useEffect(() => {
    try {
      const storedUrl = window.sessionStorage.getItem(`deploy-url:${chatId}`);
      if (storedUrl) {
        setDeployUrl(storedUrl);
        setHasDeployed(true);
      }
    } catch {
      // Ignore storage access failures.
    }
  }, [chatId]);

  useEffect(() => {
    if (initialIsPublic && !shareUrl) {
      setShareUrl(`${window.location.origin}/preview/${chatId}`);
    }
  }, [chatId, initialIsPublic, shareUrl]);

  async function handleDownloadZip() {
    setInputErrorMessage("");
    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      await downloadWebsiteZip(chatId);
      setIsDownloading(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    } catch (error) {
      console.error("Failed to download ZIP:", error);
      setInputErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to download ZIP. Please try again."
      );
      setIsDownloading(false);
    }
  }

  async function handleShareToggle(nextIsPublic: boolean) {
    setInputErrorMessage("");
    setIsSharing(true);

    try {
      const response = await fetch("/api/website/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chatId, isPublic: nextIsPublic }),
      });

      const data = (await response.json()) as
        | { shareUrl?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? t("shareUpdateFailed", language));
      }

      setIsPublic(nextIsPublic);
      setShareUrl(
        typeof data?.shareUrl === "string"
          ? data.shareUrl
          : nextIsPublic
            ? `/preview/${chatId}`
            : null
      );
    } catch (error) {
      setInputErrorMessage(
        error instanceof Error
          ? error.message
          : t("shareUpdateFailed", language)
      );
    } finally {
      setIsSharing(false);
    }
  }

  async function handleDeploy() {
    setInputErrorMessage("");
    setDeployError("");
    setIsDeploying(true);

    try {
      const response = await fetch("/api/website/deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chatId }),
      });

      const data = (await response.json()) as
        | { deployUrl?: string; error?: string }
        | null;

      if (!response.ok || typeof data?.deployUrl !== "string") {
        throw new Error(data?.error ?? t("deployFailed", language));
      }

      setDeployUrl(data.deployUrl);
      setHasDeployed(true);

      try {
        window.sessionStorage.setItem(`deploy-url:${chatId}`, data.deployUrl);
      } catch {
        // Ignore storage access failures.
      }

      window.open(data.deployUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("deployFailed", language);
      setDeployError(message);
      setInputErrorMessage(message);
    } finally {
      setIsDeploying(false);
    }
  }

  async function handleSend(content: string) {
    // Optimistically add the user message to the UI
    const tempUserMessage: HistoryMessage = {
      id: `temp-${Date.now()}`,
      chat_id: chatId,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setIsSending(true);
    setInputErrorMessage("");

    try {
      const data = await sendChatMessage(chatId, content, language);

      // Replace optimistic messages with the real ones from DB
      setMessages(data.messages);

      // Show preview only when backend returns actual generated HTML.
      if (typeof data.html === "string") {
        const nextHtml = data.html.trim();
        if (nextHtml.length > 0) {
          setHtml(data.html);
          setPreviewOpen(true);
        } else {
          setHtml(null);
          setPreviewOpen(false);
        }
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

      setInputErrorMessage(friendly);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempUserMessage.id));
    } finally {
      setIsSending(false);
    }
  }

  const handleEditorChange = useCallback((nextHtml: string) => {
    setHtml(nextHtml);

    if (nextHtml.trim().length > 0) {
      setPreviewOpen(true);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex h-full min-w-0 flex-col overflow-hidden bg-[radial-gradient(1000px_420px_at_50%_-140px,rgba(167,139,250,0.06),transparent_62%),var(--app-bg)]"
    >
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

      {/* Desktop: side-by-side split layout */}
      <div className="builder-desktop-split hidden min-h-0 flex-1 md:flex">
        {/* Left: Chat panel */}
        <div className="flex min-w-0 flex-1 flex-col">
          <ChatPanel
            chatTitle={chatTitle}
            messages={messages}
            onSend={handleSend}
            onTogglePreview={() => setPreviewOpen((prev) => !prev)}
            previewOpen={previewOpen}
            hasPreview={hasPreview}
            isSending={isSending}
            currentUserAvatarUrl={currentUserAvatarUrl}
            inputErrorMessage={inputErrorMessage}
            showHeader={false}
            emptyStateSuggestions={<PromptSuggestions onSend={handleSend} />}
          />
        </div>

        {hasPreview ? (
          <>
            {/* Resize handle */}
            {previewOpen && (
              <ResizeHandle onResize={handleResize} onResizeEnd={handleResizeEnd} />
            )}

            {/* Right: Preview panel */}
            {previewOpen ? (
              <div
                className="shrink-0 bg-[var(--app-bg-soft)]/90 shadow-[-12px_0_32px_rgba(0,0,0,0.15)]"
                style={{
                  width: previewWidth ?? "55%",
                  pointerEvents: isResizing ? "none" : "auto",
                }}
              >
                <PreviewErrorBoundary>
                  <PreviewPanel
                    html={html}
                    chatId={chatId}
                    onChange={handleEditorChange}
                    onHtmlRestored={(restoredHtml) => setHtml(restoredHtml)}
                    isAuthenticated={isAuthenticated}
                    isPublic={isPublic}
                    shareUrl={shareUrl}
                    isSharing={isSharing}
                    onShareToggle={handleShareToggle}
                    onDeploy={handleDeploy}
                    isDeploying={isDeploying}
                    deployUrl={deployUrl}
                    deployError={deployError}
                    hasDeployed={hasDeployed}
                    onDownload={() => void handleDownloadZip()}
                    isDownloading={isDownloading}
                    downloadSuccess={downloadSuccess}
                    onClose={() => setPreviewOpen(false)}
                  />
                </PreviewErrorBoundary>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Mobile: tab-switched views */}
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        {/* Show chat tab or full chat when no preview */}
        <div className={`min-h-0 flex-1 flex-col ${!hasPreview || mobileTab === "chat" ? "flex" : "hidden"}`}>
          <ChatPanel
            chatTitle={chatTitle}
            messages={messages}
            onSend={handleSend}
            onTogglePreview={() => setPreviewOpen((prev) => !prev)}
            previewOpen={previewOpen}
            hasPreview={hasPreview}
            isSending={isSending}
            currentUserAvatarUrl={currentUserAvatarUrl}
            inputErrorMessage={inputErrorMessage}
            showHeader={false}
            emptyStateSuggestions={<PromptSuggestions onSend={handleSend} />}
          />
        </div>

        {/* Mobile preview tab */}
        {hasPreview && mobileTab === "preview" && (
          <div className="min-h-0 flex-1">
            <PreviewErrorBoundary>
              <PreviewPanel
                html={html}
                chatId={chatId}
                onChange={handleEditorChange}
                onHtmlRestored={(restoredHtml) => setHtml(restoredHtml)}
                isAuthenticated={isAuthenticated}
                isPublic={isPublic}
                shareUrl={shareUrl}
                isSharing={isSharing}
                onShareToggle={handleShareToggle}
                onDeploy={handleDeploy}
                isDeploying={isDeploying}
                deployUrl={deployUrl}
                deployError={deployError}
                hasDeployed={hasDeployed}
                onDownload={() => void handleDownloadZip()}
                isDownloading={isDownloading}
                downloadSuccess={downloadSuccess}
              />
            </PreviewErrorBoundary>
          </div>
        )}
      </div>
    </div>
  );
}
