import Link from "next/link";
import { Sparkles } from "lucide-react";

/**
 * Top section of the sidebar — app brand and user greeting.
 * Clicking the brand navigates to app home.
 */
export default function SidebarHeader() {
  return (
    <div>
      <Link
        href="/"
        className="group flex items-center gap-3 transition hover:opacity-90"
      >
        <Sparkles
          size={34}
          strokeWidth={1.7}
          className="prismatic-icon shrink-0"
        />
        <div className="flex flex-col leading-tight">
          <span className="prismatic-text text-base font-bold uppercase tracking-[0.22em]">
            AI Website
          </span>
          <span className="prismatic-text text-base font-bold uppercase tracking-[0.22em]">
            Builder
          </span>
        </div>
      </Link>
    </div>
  );
}
