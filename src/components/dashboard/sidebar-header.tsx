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
    <div className="px-5 pb-2 pt-6">
      <Link
        href="/dashboard"
        className="group flex items-center gap-2.5 transition hover:opacity-90"
      >
        <Sparkles
          size={17}
          className="prismatic-icon"
        />
        <p className="prismatic-text text-sm font-semibold uppercase tracking-[0.2em]">
          AI Website Builder
        </p>
      </Link>
    </div>
  );
}
