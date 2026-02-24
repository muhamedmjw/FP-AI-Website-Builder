import Link from "next/link";
import { Plus } from "lucide-react";

/**
 * "New Website" button - navigates to app home
 * where the user can type a prompt to start a new project.
 */
export default function NewChatButton() {
  return (
    <div className="px-5 pb-4 pt-8">
      <Link
        href="/"
        className="flex h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-[var(--app-btn-primary-bg)] px-4 text-lg font-semibold text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-md)] transition hover:bg-[var(--app-btn-primary-hover)] hover:shadow-[var(--app-shadow-lg)] hover:-translate-y-px active:translate-y-0"
      >
        <Plus size={20} strokeWidth={2.5} />
        New Website
      </Link>
    </div>
  );
}
