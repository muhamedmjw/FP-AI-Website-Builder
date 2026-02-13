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
};

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Describe the website you want to build...",
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
      className="flex items-center gap-2 border-t border-slate-800 px-4 py-3"
    >
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-900 transition hover:bg-slate-200 disabled:opacity-50"
        title="Send"
      >
        <SendHorizontal size={16} />
      </button>
    </form>
  );
}
