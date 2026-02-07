"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

type ViewState = "loading" | "guest" | "user";

export default function HomeContent() {
  const [viewState, setViewState] = useState<ViewState>("loading");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      setViewState(data.session ? "user" : "guest");
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setViewState(session ? "user" : "guest");
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (viewState === "loading") {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6">
          <p className="text-slate-300">Loading...</p>
        </div>
      </main>
    );
  }

  if (viewState === "user") {
    async function handleSignOut() {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      setViewState("guest");
    }

    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6">
          <div>
            <h1 className="text-3xl font-semibold text-white">Workspace</h1>
            <p className="mt-3 text-slate-300">This page is intentionally empty for now.</p>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-6 inline-flex h-10 items-center justify-center rounded-xl border border-slate-700 px-4 text-sm font-semibold text-slate-100 hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </main>
    );
  }

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
            href="/register"
          >
            Create account
          </a>
        </div>
      </div>
    </main>
  );
}
