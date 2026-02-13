import Link from "next/link";
import { Sparkles } from "lucide-react";

type SidebarHeaderProps = {
  userName: string | null;
};

/**
 * Top section of the sidebar — app brand and user greeting.
 * Clicking the brand navigates to app home.
 */
export default function SidebarHeader({
  userName,
}: SidebarHeaderProps) {
  const greetingName = userName?.trim() || "Builder";

  return (
    <div className="px-5 pb-2 pt-6">
      <Link
        href="/"
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
      <p className="mt-2 text-xs text-neutral-500">Welcome, {greetingName}</p>
    </div>
  );
}
