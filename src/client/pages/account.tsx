import Link from "next/link";
import GradientMesh from "@/client/components/ui/gradient-mesh";

/**
 * Landing page - always shows the public/guest marketing view.
 * Authenticated users are directed to / by the proxy,
 * so this component never needs to check auth state.
 */
export default function AccountPageView() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0a] text-neutral-200">
      <GradientMesh />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start justify-center gap-6 px-6">
        <p className="prismatic-text text-xs font-semibold uppercase tracking-[0.3em]">
          AI Website Builder
        </p>
        <h1 className="text-4xl font-semibold text-white">
          Build full websites from a short prompt.
        </h1>
        <p className="text-base text-neutral-400">
          Sign in to start a new chat and generate a complete website structure
          with pages, sections, and ready-to-run code.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            className="rainbow-hover inline-flex h-11 items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
            href="/signin"
          >
            Sign in
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-xl border-2 border-white/25 px-6 text-sm font-semibold text-neutral-200 shadow-[0_4px_16px_rgba(255,255,255,0.1)] transition hover:translate-y-[-2px] hover:border-white/40 hover:text-white hover:shadow-[0_8px_24px_rgba(255,255,255,0.18)]"
            href="/signup"
          >
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}
