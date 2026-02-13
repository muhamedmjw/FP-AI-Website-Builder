import Link from "next/link";
import { Plus } from "lucide-react";

/**
 * "New Website" button — navigates to the dashboard home
 * where the user can type a prompt to start a new project.
 */
export default function NewChatButton() {
  return (
    <div className="px-5 py-3.5">
      <Link
        href="/dashboard"
        className="rainbow-hover flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-white px-4 text-base font-semibold text-slate-900 shadow-[0_10px_24px_rgba(2,6,23,0.35)] transition hover:bg-slate-200"
      >
        <Plus size={18} strokeWidth={2.5} />
        New Website
      </Link>
    </div>
  );
}
