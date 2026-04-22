"use client";

import { AlertOctagon, Plus } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";

type ChatLockedModalProps = {
  isOpen: boolean;
};

export default function ChatLockedModal({ isOpen }: ChatLockedModalProps) {
  const { language } = useLanguage();

  if (!isOpen) return null;

  const isRtl = language === "ar" || language === "ku";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[var(--app-bg)] p-6 shadow-2xl ring-1 ring-white/10" dir={isRtl ? "rtl" : "ltr"}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20 text-red-500">
            <AlertOctagon size={20} />
          </div>
          <h2 className="text-xl font-semibold text-[var(--app-text-heading)]">
            {t("chatLocked", language)}
          </h2>
        </div>
        
        <p className="mb-6 text-sm text-[var(--app-text-secondary)]">
          {t("chatLockedDescription", language)}
        </p>

        <div className={`flex ${isRtl ? "justify-start" : "justify-end"}`}>
          <Link
            href="/chat"
            className="flex items-center gap-2 rounded-lg bg-[var(--app-btn-primary-bg)] px-4 py-2 text-sm font-medium text-[var(--app-btn-primary-text)] hover:opacity-90"
          >
            <Plus size={16} />
            {t("startNewChat", language)}
          </Link>
        </div>
      </div>
    </div>
  );
}
