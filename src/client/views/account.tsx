import Link from "next/link";
import GradientMesh from "@/client/components/ui/gradient-mesh";

/**
 * Landing page - always shows the public/guest marketing view.
 * Authenticated users are directed to / by the proxy,
 * so this component never needs to check auth state.
 */
export default function AccountPageView() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--app-text-primary)]">
      <GradientMesh />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start justify-center gap-5 px-4 sm:gap-6 sm:px-6">
        <p className="prismatic-text text-xs font-semibold uppercase tracking-[0.3em]">
          AI Website Builder
        </p>
        <h1 className="text-2xl font-semibold text-[var(--app-text-heading)] sm:text-4xl">
          Build full websites from a short prompt.
        </h1>
        <p className="text-sm text-[var(--app-text-secondary)] sm:text-base">
          Sign in to start a new chat and generate a complete website structure
          with pages, sections, and ready-to-run code.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--app-btn-primary-bg)] px-6 text-sm font-semibold text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:bg-[var(--app-btn-primary-hover)] hover:shadow-[var(--app-shadow-md)] hover:-translate-y-px active:translate-y-0"
            href="/signin"
          >
            Sign in
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-xl border-2 border-[var(--app-card-border)] px-6 text-sm font-semibold text-[var(--app-text-secondary)] shadow-[var(--app-shadow-sm)] transition hover:-translate-y-px hover:border-[var(--app-text-tertiary)] hover:text-[var(--app-text-heading)] hover:shadow-[var(--app-shadow-md)]"
            href="/signup"
          >
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}
