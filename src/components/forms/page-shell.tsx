import { ReactNode } from "react";
import GradientMesh from "@/components/ui/gradient-mesh";

type PageShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function PageShell({ title, subtitle, children }: PageShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <GradientMesh />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-12">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-4">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">AI Website Builder</p>
            <h1 className="text-4xl font-semibold leading-tight text-white">{title}</h1>
            <p className="text-base text-slate-300">{subtitle}</p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Generate a full website structure from a short prompt.</li>
              <li>Save multiple chats and revisit your history.</li>
              <li>Export ready-to-run code templates.</li>
            </ul>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-[0_0_0_1px_rgba(148,163,184,0.05)]">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
