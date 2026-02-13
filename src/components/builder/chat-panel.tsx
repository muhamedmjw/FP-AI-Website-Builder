"use client";

import { useRef, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { HistoryMessage } from "@/lib/types/database";
import ChatBubble from "@/components/builder/chat-bubble";
import ChatInput from "@/components/builder/chat-input";

/**
 * Chat panel — displays conversation history and input bar.
 * Takes up the left side of the builder split view.
 */

type ChatPanelProps = {
  chatTitle?: string;
  messages: HistoryMessage[];
  onSend: (message: string) => void;
  isSending?: boolean;
};

export default function ChatPanel({
  chatTitle = "Chat",
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
      {/* Header with blur */}
      <div className="sticky top-0 z-10 border-b border-slate-800/60 bg-slate-950/70 px-4 py-3 backdrop-blur-xl sm:px-5">
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="text-violet-400" />
          <h2 className="truncate text-sm font-medium text-slate-300">
            {chatTitle}
          </h2>
        </div>
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-8 lg:px-14"
      >
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
          <div className="flex items-start gap-3 pr-4 sm:pr-8 lg:pr-16">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-400">
              <MessageSquare size={14} />
            </div>
            <div className="rounded-2xl bg-slate-800/80 px-4 py-3 text-sm text-slate-400">
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
