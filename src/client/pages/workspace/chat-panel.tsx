"use client";

import { Fragment, ReactNode, useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import { HistoryMessage } from "@/shared/types/database";
import ChatBubble from "@/client/pages/workspace/chat-bubble";
import ChatInput from "@/client/pages/workspace/chat-input";

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
  disableInput?: boolean;
  inputPlaceholder?: string;
  inputErrorMessage?: string;
  showHeader?: boolean;
  centerInputWhenEmpty?: boolean;
  messageListFooter?: ReactNode;
  inlineAttachments?: Array<{
    id: string;
    anchorMessageId: string;
    node: ReactNode;
  }>;
};

export default function ChatPanel({
  chatTitle = "Chat",
  messages,
  onSend,
  isSending = false,
  currentUserAvatarUrl = null,
  disableInput = false,
  inputPlaceholder = "Describe the website you want to build...",
  inputErrorMessage = "",
  showHeader = true,
  centerInputWhenEmpty = false,
  messageListFooter = null,
  inlineAttachments = [],
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const visibleMessages = messages.filter((msg) => msg.role !== "system");
  const shouldCenterInput = centerInputWhenEmpty && visibleMessages.length === 0;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      {showHeader ? (
        <div className="sticky top-0 z-10 bg-transparent px-5 py-4">
          <div className="mx-auto flex w-full max-w-4xl items-center gap-2.5">
            <h2 className="truncate text-base font-semibold text-[var(--app-text-heading)]">
              {chatTitle}
            </h2>
          </div>
        </div>
      ) : null}

      {shouldCenterInput ? (
        <div className="flex flex-1 items-center justify-center px-5 py-8">
          <div className="w-full max-w-4xl">
            <div className="mx-auto max-w-lg text-center">
              <p className="text-xl font-semibold text-[var(--app-text-heading)]">
                Start your website with one prompt
              </p>
              <p className="mt-2 text-base text-[var(--app-text-tertiary)]">
                Describe your business, style, and goals. I will turn it into a
                complete website structure.
              </p>
            </div>
            <ChatInput
              onSend={onSend}
              disabled={isSending || disableInput}
              placeholder={inputPlaceholder}
              isSticky={false}
              autoFocus
            />
            {inputErrorMessage ? (
              <p
                className="mx-auto mt-1 max-w-4xl px-5 text-sm text-rose-400"
                role="alert"
              >
                {inputErrorMessage}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          {/* Message list */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-5 py-8"
          >
            {visibleMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-lg text-center">
                  <p className="text-xl font-semibold text-[var(--app-text-heading)]">
                    Start your website with one prompt
                  </p>
                  <p className="mt-2 text-base text-[var(--app-text-tertiary)]">
                    Describe your business, style, and goals. I will turn it into a
                    complete website structure.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-4xl space-y-5 pb-8">
                {visibleMessages.map((msg) => (
                  <Fragment key={msg.id}>
                    <ChatBubble
                      role={msg.role}
                      content={msg.content}
                      userAvatarUrl={currentUserAvatarUrl}
                    />
                    {inlineAttachments
                      .filter((attachment) => attachment.anchorMessageId === msg.id)
                      .map((attachment) => (
                        <Fragment key={attachment.id}>{attachment.node}</Fragment>
                      ))}
                  </Fragment>
                ))}

                {messageListFooter}

                {isSending && (
                  <div className="ui-fade-up mr-auto flex max-w-[78%] items-start gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--app-avatar-bot-bg)] text-[var(--app-avatar-bot-text)]">
                      <MessageSquare size={15} />
                    </div>
                    <div className="rounded-2xl bg-[var(--app-bubble-bot-bg)] px-4 py-3.5 text-base text-[var(--app-bubble-bot-text)] shadow-[var(--app-shadow-md)]">
                      Generating...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input bar */}
          <div>
            {inputErrorMessage ? (
              <p className="mx-auto max-w-4xl px-5 text-sm text-rose-400" role="alert">
                {inputErrorMessage}
              </p>
            ) : null}
            <ChatInput
              onSend={onSend}
              disabled={isSending || disableInput}
              placeholder={inputPlaceholder}
              isSticky
            />
          </div>
        </>
      )}
    </div>
  );
}
