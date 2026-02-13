type SidebarHeaderProps = {
  userName: string | null;
};

/**
 * Top section of the sidebar — app brand and user greeting.
 */
export default function SidebarHeader({ userName }: SidebarHeaderProps) {
  return (
    <div className="space-y-1 px-4 pb-4 pt-6">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
        AI Website Builder
      </p>
      {userName ? (
        <p className="text-sm text-slate-300">Hi, {userName}</p>
      ) : null}
    </div>
  );
}
