"use client";

import { Fragment, ReactNode, useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { HistoryMessage } from "@/shared/types/database";
import ChatBubble from "@/client/features/chat/chat-bubble";
import ChatInput from "@/client/features/chat/chat-input";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";
import type { AppLanguage } from "@/shared/types/database";

function ElapsedTimer({ language }: { language: AppLanguage }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (language === "ar") {
    return <>{seconds}ث</>;
  }

  if (language === "ku") {
    return <>{seconds} چرکە</>;
  }

  return <>{seconds}s</>;
}

function GeneratingDots() {
  return (
    <span className="generating-dots" role="status" aria-live="polite" aria-label="Generating">
      <span />
      <span />
      <span />
    </span>
  );
}

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
  chatTitle,
  messages,
  onSend,
  isSending = false,
  currentUserAvatarUrl = null,
  disableInput = false,
  inputPlaceholder,
  inputErrorMessage = "",
  showHeader = true,
  centerInputWhenEmpty = false,
  messageListFooter = null,
  inlineAttachments = [],
}: ChatPanelProps) {
  const { language } = useLanguage();
  const isRtlLanguage = language === "ar" || language === "ku";
  const scrollRef = useRef<HTMLDivElement>(null);
  const visibleMessages = messages.filter((msg) => msg.role !== "system");
  const shouldCenterInput = centerInputWhenEmpty && visibleMessages.length === 0;
  const emptyStateTitle = t("emptyStateTitle", language);
  const emptyStateDescription = t("emptyStateDesc", language);
  const resolvedInputPlaceholder =
    inputPlaceholder ?? t("inputPlaceholder", language);
  const resolvedChatTitle = chatTitle ?? t("chat", language);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      {showHeader ? (
        <div className="sticky top-0 z-10 bg-transparent px-3 py-3 sm:px-5 sm:py-4">
          <div className="mx-auto flex w-full max-w-4xl items-center gap-2.5">
            <h2 className="truncate text-sm font-semibold text-[var(--app-text-heading)] sm:text-base">
              {resolvedChatTitle}
            </h2>
          </div>
        </div>
      ) : null}

      {shouldCenterInput ? (
        <div className="flex flex-1 items-center justify-center px-3 py-6 sm:px-5 sm:py-8">
          <div className="w-full max-w-4xl">
            <div className="mx-auto max-w-lg text-center">
              <p className="text-lg font-semibold text-[var(--app-text-heading)] sm:text-xl">
                {emptyStateTitle}
              </p>
              <p className="mt-2 text-sm text-[var(--app-text-tertiary)] sm:text-base">
                {emptyStateDescription}
              </p>
            </div>
            <ChatInput
              onSend={onSend}
              disabled={isSending || disableInput}
              placeholder={resolvedInputPlaceholder}
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
            className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-5 sm:py-8"
          >
            {visibleMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-lg px-4 text-center">
                  <p className="text-lg font-semibold text-[var(--app-text-heading)] sm:text-xl">
                    {emptyStateTitle}
                  </p>
                  <p className="mt-2 text-sm text-[var(--app-text-tertiary)] sm:text-base">
                    {emptyStateDescription}
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
                  <div
                    dir="ltr"
                    className="chat-generating-indicator ui-fade-up ml-0 mr-auto flex max-w-[92%] items-start gap-2 sm:max-w-[78%] sm:gap-2.5"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--app-avatar-bot-bg)] text-[var(--app-avatar-bot-text)] sm:h-9 sm:w-9">
                      <MessageSquare size={15} />
                    </div>
                    <div className="min-w-0">
                      <p
                        dir={isRtlLanguage ? "rtl" : "ltr"}
                        className={`generating-status mb-1 text-[10px] font-medium tracking-[0.04em] sm:text-xs ${
                          isRtlLanguage ? "text-right" : "text-left"
                        }`}
                      >
                        {t("generatingCode", language)} (<ElapsedTimer language={language} />)
                      </p>
                      <div className="generating-bubble rounded-2xl px-3 py-2.5 shadow-[var(--app-shadow-md)] sm:px-4 sm:py-3.5">
                        <GeneratingDots />
                      </div>
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
              placeholder={resolvedInputPlaceholder}
              isSticky
            />
          </div>
        </>
      )}
    </div>
  );
}
