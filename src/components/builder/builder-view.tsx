"use client";

import { useCallback, useState } from "react";
import { PanelRightOpen, X } from "lucide-react";
import { HistoryMessage } from "@/lib/types/database";
import ChatPanel from "@/components/builder/chat-panel";
import PreviewPanel from "@/components/builder/preview-panel";
import ResizeHandle from "@/components/builder/resize-handle";

/**
 * Builder view - main split layout.
 * Chat is always visible; preview appears only when generated HTML exists.
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

  const [messages, setMessages] = useState<HistoryMessage[]>(initialMessages);
  const [html, setHtml] = useState<string | null>(initialHtml);
  const [isSending, setIsSending] = useState(false);

  // Preview panel state
  const [previewOpen, setPreviewOpen] = useState(hasInitialPreview);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const hasPreview = typeof html === "string" && html.trim().length > 0;

  // Initialise preview width lazily from container width
  const getInitialWidth = useCallback((containerWidth: number) => {
    return Math.round(containerWidth * DEFAULT_PREVIEW_FRACTION);
  }, []);

  const handleResize = useCallback(
    (deltaX: number) => {
      setIsResizing(true);
      setPreviewWidth((prev) => {
        const container = document.getElementById("builder-container");
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

    try {
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, content }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message.");
      }

      const data = await response.json();

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
      console.error("Failed to send message:", error);

      // Remove the optimistic message on failure
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== tempUserMessage.id)
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div
      id="builder-container"
      className="flex h-full bg-[radial-gradient(1000px_420px_at_50%_-140px,rgba(167,139,250,0.06),transparent_62%),var(--app-bg)]"
    >
      {/* Left: Chat panel */}
      <div className="flex min-w-0 flex-1 flex-col">
        <ChatPanel
          chatTitle={chatTitle}
          messages={messages}
          onSend={handleSend}
          isSending={isSending}
          currentUserAvatarUrl={currentUserAvatarUrl}
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
              className="relative shrink-0 bg-[#101010]/90 shadow-[-12px_0_32px_rgba(0,0,0,0.4)]"
              style={{
                width: previewWidth ?? "55%",
                pointerEvents: isResizing ? "none" : "auto",
              }}
            >
              {/* Close preview button */}
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rainbow-hover absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-[#161616]/80 text-neutral-400 backdrop-blur-sm transition hover:bg-[#222222] hover:text-white"
                title="Close preview"
              >
                <X size={16} />
              </button>
              <PreviewPanel html={html} />
            </div>
          ) : (
            /* Open preview button when preview is collapsed */
            <div className="flex shrink-0 items-center px-2">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="rainbow-hover flex h-10 w-10 items-center justify-center rounded-xl bg-[#161616] text-neutral-400 transition hover:bg-[#222222] hover:text-neutral-200"
                title="Open preview"
              >
                <PanelRightOpen size={18} />
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
