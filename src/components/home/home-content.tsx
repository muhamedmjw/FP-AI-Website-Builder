import GradientMesh from "@/components/ui/gradient-mesh";

/**
 * Landing page — always shows the public/guest marketing view.
 * Authenticated users are directed to /dashboard by the middleware,
 * so this component never needs to check auth state.
 */
export default function HomeContent() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <GradientMesh />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start justify-center gap-6 px-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">AI Website Builder</p>
        <h1 className="text-4xl font-semibold text-white">
          Build full websites from a short prompt.
        </h1>
        <p className="text-base text-slate-300">
          Sign in to start a new chat and generate a complete website structure
          with pages, sections, and ready-to-run code.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-slate-900"
            href="/login"
          >
            Sign in
          </a>
          <a
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-700 px-6 text-sm font-semibold text-slate-100"
            href="/register"
          >
            Create account
          </a>
        </div>
      </div>
    </main>
  );
}
