import Link from "next/link";
import GradientMesh from "@/components/ui/gradient-mesh";

/**
 * Landing page — always shows the public/guest marketing view.
 * Authenticated users are directed to /dashboard by the middleware,
 * so this component never needs to check auth state.
 */
export default function HomeContent() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0a] text-neutral-200">
      <GradientMesh />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start justify-center gap-6 px-6">
        <p className="prismatic-text text-xs font-semibold uppercase tracking-[0.3em]">AI Website Builder</p>
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
            href="/login"
          >
            Sign in
          </Link>
          <Link
            className="prismatic-border-hover inline-flex h-11 items-center justify-center rounded-xl border border-white/10 px-6 text-sm font-semibold text-neutral-200 transition hover:text-white"
            href="/register"
          >
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}
