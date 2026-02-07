export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start justify-center gap-6 px-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">AI Website Builder</p>
        <h1 className="text-4xl font-semibold text-white">Build full websites from a short prompt.</h1>
        <p className="text-base text-slate-300">
          Sign in to start a new chat and generate a complete website structure with pages,
          sections, and ready-to-run code.
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
            href="/signup"
          >
            Create account
          </a>
        </div>
      </div>
    </main>
  );
}
