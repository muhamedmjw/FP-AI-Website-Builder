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
  currentUserAvatarUrl?: string | null;
};

export default function ChatPanel({
  chatTitle = "Chat",
  messages,
  onSend,
  isSending = false,
  currentUserAvatarUrl = null,
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
      <div className="sticky top-0 z-10 bg-transparent px-5 py-4">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-2.5">
          <MessageSquare size={16} className="prismatic-icon" />
          <h2 className="truncate text-base font-semibold text-neutral-100">
            {chatTitle}
          </h2>
        </div>
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-8"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-lg text-center">
              <p className="text-xl font-semibold text-neutral-200">
                Start your website with one prompt
              </p>
              <p className="mt-2 text-base text-neutral-500">
                Describe your business, style, and goals. I will turn it into a
                complete website structure.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-4xl space-y-5 pb-8">
            {messages
              .filter((msg) => msg.role !== "system")
              .map((msg) => (
                <ChatBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  userAvatarUrl={currentUserAvatarUrl}
                />
              ))}

            {isSending && (
              <div className="ui-fade-up mr-auto flex max-w-[78%] items-start gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-neutral-300">
                  <MessageSquare size={15} />
                </div>
                <div className="rounded-2xl bg-[#1a1a1a] px-4 py-3.5 text-base text-neutral-300 shadow-[0_10px_24px_rgba(0,0,0,0.3)]">
                  Generating...
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input bar */}
      <ChatInput onSend={onSend} disabled={isSending} />
    </div>
  );
}
