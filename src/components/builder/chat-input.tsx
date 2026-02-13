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
      className="sticky bottom-0 z-10 bg-[#0d1529]/70 px-5 py-4 backdrop-blur-xl"
    >
      <div className="mx-auto flex w-full max-w-4xl items-center gap-2 rounded-2xl bg-slate-900/60 p-2 shadow-[0_16px_30px_rgba(2,6,23,0.35)]">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 rounded-xl bg-transparent px-3 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled}
          className="rainbow-hover flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-900 transition hover:bg-slate-200 disabled:opacity-50"
          title="Send"
        >
          <SendHorizontal size={17} />
        </button>
      </div>
    </form>
  );
}
