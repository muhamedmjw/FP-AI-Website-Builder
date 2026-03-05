"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, MessageCircle, PanelRightOpen } from "lucide-react";
import { HistoryMessage } from "@/shared/types/database";
import { sendChatMessage } from "@/client/lib/api/chat-api";
import { downloadWebsiteZip } from "@/client/lib/zip-download";
import { useMobileHeaderTitle } from "@/client/components/mobile-header-title-context";
import ChatPanel from "@/client/features/chat/chat-panel";
import PreviewPanel from "@/client/features/preview/preview-panel";
import ResizeHandle from "@/client/features/builder/resize-handle";

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
  currentUserAvatarUrl = null,
}: BuilderViewProps) {
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

        // Clamp between min and (container - 300px for chat panel).
        const maxPreview = containerWidth - 300;
        return Math.max(MIN_PREVIEW_WIDTH, Math.min(next, maxPreview));
      });
    },
    [getInitialWidth]
  );

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

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
      const data = await sendChatMessage(chatId, content);

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

  return (
    <div
      ref={containerRef}
      className="flex h-full min-w-0 flex-col overflow-hidden bg-[radial-gradient(1000px_420px_at_50%_-140px,rgba(167,139,250,0.06),transparent_62%),var(--app-bg)]"
    >
      {/* Mobile tab bar — only visible on small screens when preview exists */}
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

      {/* Desktop: side-by-side split layout */}
      <div className="hidden min-h-0 flex-1 md:flex">
        {/* Left: Chat panel */}
        <div className="flex min-w-0 flex-1 flex-col">
          <ChatPanel
            chatTitle={chatTitle}
            messages={messages}
            onSend={handleSend}
            isSending={isSending}
            currentUserAvatarUrl={currentUserAvatarUrl}
            inputErrorMessage={inputErrorMessage}
            showHeader={false}
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
                <PreviewPanel
                  html={html}
                  onDownload={() => void handleDownloadZip()}
                  isDownloading={isDownloading}
                  downloadSuccess={downloadSuccess}
                  onClose={() => setPreviewOpen(false)}
                />
              </div>
            ) : (
              /* Open preview button when preview is collapsed */
              <div className="flex shrink-0 items-center px-2">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--app-card-bg)] text-[var(--app-text-tertiary)] shadow-[var(--app-shadow-sm)] transition hover:bg-[var(--app-hover-bg-strong)] hover:text-[var(--app-text-heading)]"
                  title="Open preview"
                >
                  <PanelRightOpen size={18} />
                </button>
              </div>
            )}
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
            isSending={isSending}
            currentUserAvatarUrl={currentUserAvatarUrl}
            inputErrorMessage={inputErrorMessage}
            showHeader={false}
          />
        </div>

        {/* Mobile preview tab */}
        {hasPreview && mobileTab === "preview" && (
          <div className="min-h-0 flex-1">
            <PreviewPanel
              html={html}
              onDownload={() => void handleDownloadZip()}
              isDownloading={isDownloading}
              downloadSuccess={downloadSuccess}
            />
          </div>
        )}
      </div>
    </div>
  );
}
