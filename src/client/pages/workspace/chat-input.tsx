"use client";

import { FormEvent, useRef } from "react";
import { SendHorizontal } from "lucide-react";

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
  placeholder = "Describe the website you want to build...",
  isSticky = true,
  autoFocus = false,
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

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
      className={`${isSticky ? "sticky bottom-0 z-10" : ""} bg-transparent px-5 py-4`}
    >
      <div className="mx-auto flex w-full max-w-4xl items-center gap-2 rounded-2xl bg-[#161616]/80 p-2 shadow-[0_16px_30px_rgba(0,0,0,0.4)]">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className="flex-1 rounded-xl bg-transparent px-3 py-2.5 text-base text-neutral-100 placeholder:text-neutral-600 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled}
          className="rainbow-hover flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-neutral-900 transition hover:bg-neutral-100 disabled:opacity-50"
          title="Send"
        >
          <SendHorizontal size={17} />
        </button>
      </div>
    </form>
  );
}
