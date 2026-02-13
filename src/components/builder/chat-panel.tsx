"use client";

import { useRef, useEffect } from "react";
import { HistoryMessage } from "@/lib/types/database";
import ChatBubble from "@/components/builder/chat-bubble";
import ChatInput from "@/components/builder/chat-input";

/**
 * Chat panel — displays conversation history and input bar.
 * Takes up the left side of the builder split view.
 */

type ChatPanelProps = {
  messages: HistoryMessage[];
  onSend: (message: string) => void;
  isSending?: boolean;
};

export default function ChatPanel({
  messages,
  onSend,
  isSending = false,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      {/* Message list */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-500">
              Describe the website you want to build to get started.
            </p>
          </div>
        ) : (
          messages
            .filter((msg) => msg.role !== "system")
            .map((msg) => (
              <ChatBubble key={msg.id} role={msg.role} content={msg.content} />
            ))
        )}

        {isSending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-800 px-4 py-3 text-sm text-slate-400">
              Generating...
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <ChatInput onSend={onSend} disabled={isSending} />
    </div>
  );
}
