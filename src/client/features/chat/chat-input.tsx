"use client";

import { FormEvent, useRef } from "react";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";

/**
 * Chat input bar — text input + send button at the bottom of the chat panel.
 */

type ChatInputProps = {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isSticky?: boolean;
  autoFocus?: boolean;
};

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder,
  isSticky = true,
  autoFocus = false,
}: ChatInputProps) {
  const { language } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const resolvedPlaceholder = placeholder ?? t("inputPlaceholder", language);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = inputRef.current?.value.trim();
    if (!message) return;

    onSend(message);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`${isSticky ? "sticky bottom-0 z-10" : ""} bg-transparent px-3 py-3 sm:px-5 sm:py-4`}
    >
      <div className="mx-auto flex w-full max-w-4xl items-center gap-2 rounded-2xl bg-[var(--app-card-bg)]/80 p-1.5 shadow-[var(--app-shadow-lg)] backdrop-blur-sm sm:p-2">
        <input
          ref={inputRef}
          type="text"
          placeholder={resolvedPlaceholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className="flex-1 rounded-xl bg-transparent px-2.5 py-2 text-sm text-[var(--app-input-text)] placeholder:text-[var(--app-text-tertiary)] focus:outline-none disabled:opacity-50 sm:px-3 sm:py-2.5 sm:text-base"
        />
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
    </form>
  );
}
