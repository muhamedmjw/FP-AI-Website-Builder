"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";
import { MAX_PROMPT_LENGTH } from "@/shared/constants/limits";
import { getDisplayModelName, PRIMARY_MODEL } from "@/shared/constants/ai";

/**
 * Chat input bar — text input + send button at the bottom of the chat panel.
 */

type ChatInputProps = {
  onSend: (message: string) => void;
  onTogglePreview?: () => void;
  previewOpen?: boolean;
  hasPreview?: boolean;
  disabled?: boolean;
  placeholder?: string;
  isSticky?: boolean;
  autoFocus?: boolean;
  showDisclaimer?: boolean;
};

export default function ChatInput({
  onSend,
  onTogglePreview,
  previewOpen = false,
  hasPreview = false,
  disabled = false,
  placeholder,
  isSticky = true,
  autoFocus = false,
  showDisclaimer = true,
}: ChatInputProps) {
  const { language } = useLanguage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState("");
  const resolvedPlaceholder = placeholder ?? t("inputPlaceholder", language);
  const displayModelName = getDisplayModelName(PRIMARY_MODEL);
  const disclaimerTemplate = t("aiDisclaimer", language);
  const disclaimerText = disclaimerTemplate.replace("{model}", displayModelName);
  const [disclaimerPrefix, disclaimerSuffix = ""] = disclaimerTemplate.split("{model}");
  const hasModelPlaceholder = disclaimerTemplate.includes("{model}");
  const charCount = inputValue.length;
  const shouldShowCounter = charCount > MAX_PROMPT_LENGTH * 0.8;
  const shouldShowPreviewToggle = typeof onTogglePreview === "function" && hasPreview;

  function adjustHeight(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight(textareaRef.current);
    }
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = inputValue.trim();
    if (!message) return;

    onSend(message);
    setInputValue("");
    setTimeout(() => {
      if (textareaRef.current) {
        adjustHeight(textareaRef.current);
      }
    }, 0);
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className={`${isSticky ? "sticky bottom-0 z-10" : ""} bg-transparent px-3 py-3 sm:px-5 sm:py-4`}
      >
        <div className="mx-auto flex w-full max-w-4xl items-end gap-2">
          <div className={`flex min-w-0 flex-1 items-end gap-2 rounded-2xl bg-[var(--app-card-bg)]/80 p-1.5 shadow-[var(--app-shadow-lg)] backdrop-blur-sm transition-opacity sm:p-2 ${disabled ? "opacity-70" : "opacity-100"}`}>
            <div className="flex min-w-0 flex-1 flex-col">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputValue}
                onChange={(event) => {
                  setInputValue(event.target.value);
                  adjustHeight(event.currentTarget);
                }}
                onKeyDown={handleKeyDown}
                maxLength={MAX_PROMPT_LENGTH}
                placeholder={resolvedPlaceholder}
                disabled={disabled}
                aria-busy={disabled}
                autoFocus={autoFocus}
                className="flex-1 resize-none overflow-hidden rounded-xl bg-transparent px-2.5 py-2.5 text-sm leading-relaxed text-[var(--app-input-text)] placeholder:text-[var(--app-text-tertiary)] focus:outline-none disabled:opacity-50 sm:px-3 sm:py-3 sm:text-base"
                style={{
                  height: "auto",
                  maxHeight: "160px",
                  overflowY: "auto",
                }}
              />
              {shouldShowCounter ? (
                <p className="px-2.5 pb-0.5 text-[10px] text-[var(--app-text-muted)] sm:px-3" aria-live="polite">
                  {charCount}/{MAX_PROMPT_LENGTH}
                </p>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={disabled}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-btn-primary-bg)] text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:bg-[var(--app-btn-primary-hover)] hover:shadow-[var(--app-shadow-md)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 sm:h-11 sm:w-11"
              title="Send"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 19V6" />
                <path d="M6.5 11.5L12 6l5.5 5.5" />
              </svg>
            </button>
          </div>

          {shouldShowPreviewToggle ? (
            <button
              type="button"
              onClick={onTogglePreview}
              className={`relative flex h-10 w-10 shrink-0 self-center items-center justify-center rounded-xl border transition-all duration-150 sm:h-11 sm:w-11 ${
                previewOpen
                  ? "bg-[var(--app-hover-bg-strong)] border-[var(--app-text-tertiary)]"
                  : "bg-[var(--app-card-bg)] border-[var(--app-card-border)]"
              } hover:bg-[var(--app-hover-bg-strong)] hover:border-[var(--app-text-muted)]`}
              title={previewOpen ? "Hide preview" : "Show preview"}
              aria-label={previewOpen ? "Hide preview" : "Show preview"}
            >
              {previewOpen ? (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--prism-2)]" aria-hidden="true" />
              ) : null}
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                className={`transition-colors ${
                  previewOpen
                    ? "text-[var(--app-text-heading)]"
                    : "text-[var(--app-text-secondary)]"
                }`}
                aria-hidden="true"
              >
                <path
                  d="M3 2h8l4 4v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M11 2v4h4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <line x1="5" y1="9" x2="13" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="5" y1="12" x2="13" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="5" y1="15" x2="10" y2="15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
        </div>
      </form>

      {showDisclaimer ? (
        <p className="relative top-px mx-auto w-full max-w-full px-4 pb-2 pt-0.5 text-center text-xs text-[var(--app-text-muted)] whitespace-normal wrap-break-word sm:px-5">
          {hasModelPlaceholder ? (
            <>
              {disclaimerPrefix}
              <span className="font-medium text-[var(--app-text-tertiary)]">{displayModelName}</span>
              {disclaimerSuffix}
            </>
          ) : (
            disclaimerText
          )}
        </p>
      ) : null}
    </>
  );
}
