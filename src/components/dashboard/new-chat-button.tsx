"use client";

/**
 * "New Website" button — triggers creating a new chat/project.
 * The actual creation logic will be wired in a later step.
 */

type NewChatButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

export default function NewChatButton({ onClick, disabled }: NewChatButtonProps) {
  return (
    <div className="px-4 py-3">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 disabled:opacity-50"
      >
        <span className="text-lg leading-none">+</span>
        New Website
      </button>
    </div>
  );
}
