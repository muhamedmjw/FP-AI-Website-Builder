import Link from "next/link";
import { Sparkles } from "lucide-react";

type SidebarHeaderProps = {
  userName: string | null;
  userAvatarUrl: string | null;
};

/**
 * Top section of the sidebar — app brand and user greeting.
 * Clicking the brand navigates to the dashboard home.
 */
export default function SidebarHeader({
  userName,
  userAvatarUrl,
}: SidebarHeaderProps) {
  const initial = userName?.trim().charAt(0).toUpperCase() || "A";

  return (
    <div className="space-y-3 px-5 pb-4 pt-6">
      <Link
        href="/dashboard"
        className="group flex items-center gap-2.5 transition hover:opacity-90"
      >
        <Sparkles
          size={17}
          className="text-sky-300 transition group-hover:text-sky-200"
        />
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300/85">
          AI Website Builder
        </p>
      </Link>
      <div className="flex items-center gap-3 rounded-xl bg-white/[0.05] px-3 py-2.5 shadow-[0_8px_20px_rgba(2,6,23,0.25)]">
        {userAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={userAvatarUrl}
            alt="Profile avatar"
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/20 text-sm font-semibold text-sky-200">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-400">Welcome back</p>
          {userName ? (
            <p className="truncate text-base font-semibold text-slate-100">
              {userName}
            </p>
          ) : (
            <p className="truncate text-base font-semibold text-slate-200">
              My Account
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
