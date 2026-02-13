"use client";

import { useCallback, useState } from "react";
import { X, PanelRightOpen } from "lucide-react";
import { HistoryMessage } from "@/lib/types/database";
import ChatPanel from "@/components/builder/chat-panel";
import PreviewPanel from "@/components/builder/preview-panel";
import ResizeHandle from "@/components/builder/resize-handle";

/**
 * Builder view — the main split-view component.
 * Chat panel on the left, resizable preview on the right.
 * Sends messages via /api/chat/send and persists them to the database.
 */

type BuilderViewProps = {
  chatId: string;
  chatTitle?: string;
  initialMessages: HistoryMessage[];
  initialHtml: string | null;
};

/** Minimum preview width in pixels */
const MIN_PREVIEW_WIDTH = 200;
/** Default preview width as a fraction of the container (0–1) */
const DEFAULT_PREVIEW_FRACTION = 0.55;

export default function BuilderView({
  chatId,
  chatTitle = "Untitled",
  initialMessages,
  initialHtml,
}: BuilderViewProps) {
  const [messages, setMessages] = useState<HistoryMessage[]>(initialMessages);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- will be used when AI generates HTML
  const [html, setHtml] = useState<string | null>(initialHtml);
  const [isSending, setIsSending] = useState(false);

  // Preview panel state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  // Initialise previewWidth lazily from container width
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

        // Moving the handle right = shrink preview, left = grow preview
        const next = current - deltaX;

        // Clamp between min and (container - 300px for chat panel)
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

      // TODO (Week 2): Update preview HTML from AI response
      // setHtml(data.html);
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
    <div id="builder-container" className="flex h-full">
      {/* Left: Chat panel — takes remaining space */}
      <div className="flex min-w-0 flex-1 flex-col border-r border-slate-800">
        <ChatPanel
          chatTitle={chatTitle}
          messages={messages}
          onSend={handleSend}
          isSending={isSending}
        />
      </div>

      {/* Resize handle */}
      {previewOpen && (
        <ResizeHandle onResize={handleResize} onResizeEnd={handleResizeEnd} />
      )}

      {/* Right: Preview panel — resizable */}
      {previewOpen ? (
        <div
          className="relative shrink-0"
          style={{
            width: previewWidth ?? "55%",
            pointerEvents: isResizing ? "none" : "auto",
          }}
        >
          {/* Close preview button */}
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/80 text-slate-400 backdrop-blur-sm transition hover:bg-slate-700 hover:text-white"
            title="Close preview"
          >
            <X size={16} />
          </button>
          <PreviewPanel html={html} />
        </div>
      ) : (
        /* Open preview button — shown when preview is collapsed */
        <div className="flex shrink-0 items-center border-l border-slate-800 px-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
            title="Open preview"
          >
            <PanelRightOpen size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
