"use client";

import { ReactNode, useCallback, useState } from "react";
import { Menu } from "lucide-react";

type WorkspaceShellProps = {
  sidebar: ReactNode;
  children: ReactNode;
  /** Whether the authenticated sidebar is present */
  hasSidebar: boolean;
};

/**
 * Client wrapper that manages the mobile sidebar drawer toggle.
 * On md+ screens the sidebar is always visible. On mobile it becomes
 * an overlay drawer toggled via a hamburger button.
 */
export default function WorkspaceShell({
  sidebar,
  children,
  hasSidebar,
}: WorkspaceShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex h-screen bg-[var(--app-bg)] text-[var(--app-text-primary)]">
      {hasSidebar ? (
        <>
          {/* Mobile header bar */}
          <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-[var(--app-border)] bg-[var(--app-panel)]/90 px-4 backdrop-blur md:hidden">
            <button
              type="button"
              onClick={openSidebar}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg-strong)] hover:text-[var(--app-text-heading)]"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <span className="prismatic-text text-sm font-bold uppercase tracking-[0.18em]">
              AI Website Builder
            </span>
          </div>

          {/* Sidebar — always visible on md+, overlay drawer on mobile */}
          {/* Desktop sidebar */}
          <div className="hidden md:flex">
            {sidebar}
          </div>

          {/* Mobile drawer overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-50 md:hidden"
              onClick={(e) => {
                if (e.target === e.currentTarget) closeSidebar();
              }}
            >
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeSidebar} />
              {/* Drawer */}
              <div className="relative z-10 h-full w-80 max-w-[85vw] animate-slide-in-left">
                {sidebar}
              </div>
            </div>
          )}

          {/* Main content — add top padding on mobile for the header bar */}
          <main className="flex-1 overflow-y-auto bg-[var(--app-bg)] pt-14 md:pt-0">
            {children}
          </main>
        </>
      ) : (
        /* Guest mode — no sidebar, no mobile header */
        <main className="flex-1 overflow-y-auto bg-[var(--app-bg)]">
          {children}
        </main>
      )}
    </div>
  );
}
