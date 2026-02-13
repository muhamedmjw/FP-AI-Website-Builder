"use client";

import { useState } from "react";
import { HistoryMessage } from "@/lib/types/database";
import ChatPanel from "@/components/builder/chat-panel";
import PreviewPanel from "@/components/builder/preview-panel";

/**
 * Builder view — the main split-view component.
 * Chat panel on the left, live preview on the right.
 * Actual message sending + AI integration will be wired in the next step.
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    // TODO: In the next step, this will call the API to:
    // 1. Save the user message to DB
    // 2. Send prompt to AI
    // 3. Save AI response to DB
    // 4. Update preview HTML

    // For now, simulate a short delay and show a placeholder response
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const tempAssistantMessage: HistoryMessage = {
      id: `temp-${Date.now() + 1}`,
      chat_id: chatId,
      role: "assistant",
      content: "AI generation will be connected in the next step. Your message was: " + content,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempAssistantMessage]);
    setIsSending(false);
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
