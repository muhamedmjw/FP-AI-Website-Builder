"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";

type NewChatButtonProps = {
  isCollapsed?: boolean;
};

/**
 * "New Website" button - navigates to app home
 * where the user can type a prompt to start a new project.
 */
export default function NewChatButton({ isCollapsed = false }: NewChatButtonProps) {
  const { language } = useLanguage();
  const label = t("newWebsite", language);

  return (
    <div
      className={
        isCollapsed
          ? "flex justify-center px-2 pb-3 pt-4"
          : "px-5 pb-4 pt-8"
      }
    >
      <Link
        href="/"
        className={`flex items-center justify-center rounded-xl bg-[var(--app-btn-primary-bg)] text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-md)] motion-safe:transition hover:bg-[var(--app-btn-primary-hover)] hover:shadow-[var(--app-shadow-lg)] motion-safe:hover:-translate-y-px active:translate-y-0 ${
          isCollapsed
            ? "h-10 w-10"
            : "h-14 w-full gap-2.5 px-4 text-lg font-semibold"
        }`}
        aria-label={label}
        title={isCollapsed ? label : undefined}
      >
        <Plus size={20} strokeWidth={2.5} />
        {!isCollapsed ? label : <span className="sr-only">{label}</span>}
      </Link>
    </div>
  );
}
