"use client";

import { useState } from "react";
import { HistoryMessage } from "@/lib/types/database";
import ChatPanel from "@/components/builder/chat-panel";
import PreviewPanel from "@/components/builder/preview-panel";

/**
 * Builder view — the main split-view component.
 * Chat panel on the left, live preview on the right.
 * Sends messages via /api/chat/send and persists them to the database.
 */

type BuilderViewProps = {
  chatId: string;
  initialMessages: HistoryMessage[];
  initialHtml: string | null;
};

export default function BuilderView({
  chatId,
  initialMessages,
  initialHtml,
}: BuilderViewProps) {
  const [messages, setMessages] = useState<HistoryMessage[]>(initialMessages);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- will be used when AI generates HTML
  const [html, setHtml] = useState<string | null>(initialHtml);
  const [isSending, setIsSending] = useState(false);

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
    <div className="flex h-full">
      {/* Left: Chat panel */}
      <div className="w-105 shrink-0 border-r border-slate-800">
        <ChatPanel
          messages={messages}
          onSend={handleSend}
          isSending={isSending}
        />
      </div>

      {/* Right: Preview panel */}
      <div className="flex-1">
        <PreviewPanel html={html} />
      </div>
    </div>
  );
}
