import Link from "next/link";
import { Sparkles } from "lucide-react";

type SidebarHeaderProps = {
  userName: string | null;
};

/**
 * Top section of the sidebar — app brand and user greeting.
 * Clicking the brand navigates to the dashboard home.
 */
export default function SidebarHeader({ userName }: SidebarHeaderProps) {
  return (
    <div className="space-y-2 px-4 pb-4 pt-6">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 transition hover:opacity-80"
      >
        <Sparkles size={16} className="text-violet-400" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          AI Website Builder
        </p>
      </Link>
      {userName ? (
        <p className="text-sm text-slate-300">Hi, {userName}</p>
      ) : null}
    </div>
  );
}
