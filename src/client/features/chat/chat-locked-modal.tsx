"use client";

import { AlertOctagon, Plus } from "lucide-react";
import Link from "next/link";

type ChatLockedModalProps = {
  isOpen: boolean;
};

export default function ChatLockedModal({ isOpen }: ChatLockedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[var(--app-bg)] p-6 shadow-2xl ring-1 ring-white/10">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20 text-red-500">
            <AlertOctagon size={20} />
          </div>
          <h2 className="text-xl font-semibold text-[var(--app-text-heading)]">
            Chat Locked
          </h2>
        </div>
        
        <p className="mb-6 text-sm text-[var(--app-text-secondary)]">
          This chat has been permanently locked due to a violation of our safety policies. We do not generate content related to explicit material, hate speech, or governmental/political campaigns.
        </p>

        <div className="flex justify-end">
          <Link
            href="/chat"
            className="flex items-center gap-2 rounded-lg bg-[var(--app-btn-primary-bg)] px-4 py-2 text-sm font-medium text-[var(--app-btn-primary-text)] hover:opacity-90"
          >
            <Plus size={16} />
            Start New Chat
          </Link>
        </div>
      </div>
    </div>
  );
}
