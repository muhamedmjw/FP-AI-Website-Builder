import Link from "next/link";
import { Plus } from "lucide-react";

/**
 * "New Website" button — navigates to the dashboard home
 * where the user can type a prompt to start a new project.
 */
export default function NewChatButton() {
  return (
    <div className="px-4 py-3">
      <Link
        href="/dashboard"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
      >
        <Plus size={16} strokeWidth={2.5} />
        New Website
      </Link>
    </div>
  );
}
