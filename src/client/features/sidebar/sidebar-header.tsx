import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";

type SidebarHeaderProps = {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
};

/**
 * Top section of the sidebar — app brand and user greeting.
 * Clicking the brand navigates to app home.
 */
export default function SidebarHeader({
  isCollapsed,
  onToggleCollapse,
}: SidebarHeaderProps) {
  if (isCollapsed) {
    return (
      <div className="flex w-full justify-center">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="group relative hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--app-text-secondary)] motion-safe:transition hover:bg-[var(--app-hover-bg-strong)] hover:text-[var(--app-text-heading)] md:flex"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <span className="flex items-center justify-center motion-safe:transition-opacity motion-safe:duration-150 group-hover:opacity-0">
            <Sparkles size={28} strokeWidth={1.7} className="prismatic-icon" />
          </span>
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 motion-safe:transition-opacity motion-safe:duration-150 group-hover:opacity-100">
            <PanelLeftOpen size={18} />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex w-full items-start justify-between gap-2">
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
          <span style={{ fontFamily: "var(--font-ui)", fontWeight: 700, letterSpacing: "0.15em" }}>
            <span className="prismatic-text block text-lg font-bold uppercase tracking-[0.22em]">
              AI Website
            </span>
            <span className="prismatic-text block text-lg font-bold uppercase tracking-[0.22em]">
              Builder
            </span>
          </span>
        </div>
      </Link>

      <button
        type="button"
        onClick={onToggleCollapse}
        className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--app-text-secondary)] motion-safe:transition hover:bg-[var(--app-hover-bg-strong)] hover:text-[var(--app-text-heading)] md:flex"
        aria-label="Collapse sidebar"
        title="Collapse sidebar"
      >
        <PanelLeftClose size={16} />
      </button>
    </div>
  );
}
