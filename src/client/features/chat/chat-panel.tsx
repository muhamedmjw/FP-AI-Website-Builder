"use client";

import { Fragment, ReactNode, useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { HistoryMessage } from "@/shared/types/database";
import ChatBubble from "@/client/features/chat/chat-bubble";
import ChatInput from "@/client/features/chat/chat-input";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";
import type { AppLanguage, UserImage } from "@/shared/types/database";

function formatElapsedTimer(seconds: number, language: AppLanguage) {
  if (language === "ar") {
    return `${seconds}ث`;
  }

  if (language === "ku") {
    return `${seconds} چرکە`;
  }

  return `${seconds}s`;
}



const EMPTY_MESSAGE_IMAGES: Record<string, Array<{
  fileId: string;
  fileName: string;
  dataUri: string;
  label: string;
}>> = {};

/**
 * Chat panel — displays conversation history and input bar.
 * Takes up the left side of the builder split view.
 */

type ChatPanelProps = {
  chatId?: string;
  chatTitle?: string;
  messages: HistoryMessage[];
  messageImages?: Record<string, Array<{
    fileId: string;
    fileName: string;
    dataUri: string;
    label: string;
  }>>;
  onSend: (message: string) => void;
  onStop?: () => void;
  onImagesChange?: (images: UserImage[]) => void;
  onTogglePreview?: () => void;
  onPreviewRequest?: () => void;
  showPreviewGateButton?: boolean;
  previewOpen?: boolean;
  hasPreview?: boolean;
  isSending?: boolean;
  sendingStartedAtMs?: number | null;
  currentUserAvatarUrl?: string | null;
  disableInput?: boolean;
  inputPlaceholder?: string;
  inputErrorMessage?: string;
  inputBanner?: ReactNode;
  showHeader?: boolean;
  centerInputWhenEmpty?: boolean;
  emptyStateSuggestions?: ReactNode;
  messageListFooter?: ReactNode;
  inlineAttachments?: Array<{
    id: string;
    anchorMessageId: string;
    node: ReactNode;
  }>;
  emptyStateMobileTuning?: boolean;
  pinDisclaimerToBottomOnMobile?: boolean;
  showInputDisclaimer?: boolean;
};

export default function ChatPanel({
  chatId,
  chatTitle,
  messages,
  messageImages = EMPTY_MESSAGE_IMAGES,
  onSend,
  onStop,
  onImagesChange,
  onTogglePreview,
  onPreviewRequest,
  showPreviewGateButton = false,
  previewOpen = false,
  hasPreview = false,
  isSending = false,
  sendingStartedAtMs = null,
  currentUserAvatarUrl = null,
  disableInput = false,
  inputPlaceholder,
  inputErrorMessage = "",
  inputBanner = null,
  showHeader = true,
  centerInputWhenEmpty = false,
  emptyStateSuggestions = null,
  messageListFooter = null,
  inlineAttachments = [],
  emptyStateMobileTuning = false,
  pinDisclaimerToBottomOnMobile = false,
  showInputDisclaimer = true,
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
  const [clockNowMs, setClockNowMs] = useState(0);

  const resolvedSendingStartedAt =
    typeof sendingStartedAtMs === "number" && Number.isFinite(sendingStartedAtMs)
      ? sendingStartedAtMs
      : null;

  const generatingSeconds = isSending
    ? resolvedSendingStartedAt
      ? Math.max(
          0,
          Math.floor(
            (Math.max(clockNowMs, resolvedSendingStartedAt) -
              resolvedSendingStartedAt) /
              1000
          )
        )
      : 0
    : 0;

  // Deduce if the user is asking to build/edit a website or just chatting
  // based on a simple heuristic of their last message.
  let isWebsiteGeneration = false;
  let isRedesign = false;
  
  const lastUserMessage = visibleMessages
    .filter((m) => m.role === "user")
    .at(-1)?.content || "";

  if (lastUserMessage) {
    const normalized = lastUserMessage.trim().toLowerCase();
    
    // Website keywords
    const enKeywords = /\b(website|web\s*site|webpage|web\s*page|landing\s*page|site|build|create|make|design|generate)\b/i;
    const arKeywords = /(موقع|صفحة|ويب|إنشاء|بناء|تصميم|اصنع|صمم|أنشئ)/;
    const kuKeywords = /(وێبسایت|ماڵپەڕ|سایت|لاپەڕە|دروست|دیزاین)/;
    
    // Redesign keywords
    const enRedesignKeywords = /\b(redesign|redo|new look|new design|different theme|new theme|different style|start over|try again|another design|completely different|change the theme|change the layout)\b/i;
    const arRedesignKeywords = /(إعادة تصميم|شكل جديد|تصميم جديد|ثيم مختلف|ثيم جديد)/;
    const kuRedesignKeywords = /(سەرلەنوێ|دیزاینێکی نوێ|شێوەیەکی نوێ|شێوازێکی تر|ڕووخسارێکی نوێ)/;

    if (enRedesignKeywords.test(normalized) || arRedesignKeywords.test(normalized) || kuRedesignKeywords.test(normalized)) {
      isWebsiteGeneration = true;
      isRedesign = true;
    } else if (enKeywords.test(normalized) || arKeywords.test(normalized) || kuKeywords.test(normalized)) {
      isWebsiteGeneration = true;
    }
  }

  const generatingLabel = isWebsiteGeneration
    ? hasPreview
      ? isRedesign
        ? t("redesigningWebsite", language)
        : t("editingWebsite", language)
      : t("generatingWebsite", language)
    : t("generatingConversation", language);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!isSending) {
      return;
    }

    const updateClock = () => {
      setClockNowMs(Date.now());
    };

    const frameId = window.requestAnimationFrame(updateClock);

    const interval = setInterval(() => {
      updateClock();
    }, 1000);

    return () => {
      window.cancelAnimationFrame(frameId);
      clearInterval(interval);
    };
  }, [isSending]);

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
            <div
              className={`mx-auto max-w-lg text-center ${
                emptyStateMobileTuning ? "-mt-7 mb-6 sm:-mt-1 sm:mb-3" : ""
              }`}
            >
              <p className="text-lg font-semibold text-[var(--app-text-heading)] sm:text-xl">
                {emptyStateTitle}
              </p>
              <p className="mt-2 text-sm text-[var(--app-text-tertiary)] sm:text-base">
                {emptyStateDescription}
              </p>
              {emptyStateSuggestions}
            </div>
            {inputErrorMessage ? (
              <p className="mx-auto max-w-4xl px-5 pb-2 text-sm text-rose-400" role="alert">
                {inputErrorMessage}
              </p>
            ) : null}
            <ChatInput
              onSend={onSend}
              onStop={onStop}
              onTogglePreview={onTogglePreview}
              onPreviewRequest={onPreviewRequest}
              showPreviewGateButton={showPreviewGateButton}
              previewOpen={previewOpen}
              hasPreview={hasPreview}
              chatId={chatId}
              onImagesChange={onImagesChange}
              disableTyping={disableInput}
              disableSend={isSending || disableInput}
              isGenerating={isSending}
              placeholder={resolvedInputPlaceholder}
              isSticky={false}
              autoFocus
              showDisclaimer={showInputDisclaimer}
              pinDisclaimerToBottomOnMobile={pinDisclaimerToBottomOnMobile}
            />
            {inputBanner}
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
                  {emptyStateSuggestions}
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
                      attachedImages={msg.role === "user" ? messageImages[msg.id] : undefined}
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
                    className="chat-generating-indicator ui-fade-up ml-0 mr-auto flex max-w-[92%] items-center gap-2 sm:max-w-[78%] sm:gap-2.5"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--app-avatar-bot-bg)] text-[var(--app-avatar-bot-text)] sm:h-9 sm:w-9">
                      <MessageSquare size={15} />
                    </div>
                    <p
                      dir={isRtlLanguage ? "rtl" : "ltr"}
                      className={`generating-status text-xs font-medium tracking-[0.04em] sm:text-sm ${
                        isRtlLanguage ? "text-right" : "text-left"
                      }`}
                    >
                      {generatingLabel} ({formatElapsedTimer(generatingSeconds, language)})
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input bar */}
          <div>
            {inputBanner}
            {inputErrorMessage ? (
              <p className="mx-auto max-w-4xl px-5 pb-2 text-sm text-rose-400" role="alert">
                {inputErrorMessage}
              </p>
            ) : null}
            <ChatInput
              onSend={onSend}
              onStop={onStop}
              onTogglePreview={onTogglePreview}
              onPreviewRequest={onPreviewRequest}
              showPreviewGateButton={showPreviewGateButton}
              previewOpen={previewOpen}
              hasPreview={hasPreview}
              chatId={chatId}
              onImagesChange={onImagesChange}
              disableTyping={disableInput}
              disableSend={isSending || disableInput}
              isGenerating={isSending}
              placeholder={resolvedInputPlaceholder}
              isSticky
              showDisclaimer={showInputDisclaimer}
              pinDisclaimerToBottomOnMobile={pinDisclaimerToBottomOnMobile}
            />
          </div>
        </>
      )}
    </div>
  );
}
