/**
 * Dashboard home — the first thing users see after logging in.
 * Shows a welcome message and instructions to get started.
 */
export default function DashboardPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-white">Welcome</h1>
        <p className="mt-3 text-sm text-slate-400">
          Create a new website project from the sidebar, or select an existing
          one to continue editing.
        </p>
      </div>
    </div>
  );
}
