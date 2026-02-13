import { ReactNode } from "react";
import GradientMesh from "@/components/ui/gradient-mesh";

type PageShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function PageShell({ title, subtitle, children }: PageShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0a] text-neutral-200">
      <GradientMesh />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-12">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-4">
            <p className="prismatic-text text-sm font-semibold uppercase tracking-[0.3em]">AI Website Builder</p>
            <h1 className="text-4xl font-semibold leading-tight text-white">{title}</h1>
            <p className="text-base text-neutral-400">{subtitle}</p>
            <ul className="space-y-2 text-sm text-neutral-500">
              <li>Generate a full website structure from a short prompt.</li>
              <li>Save multiple chats and revisit your history.</li>
              <li>Export ready-to-run code templates.</li>
            </ul>
          </section>

          <section className="rounded-3xl border border-white/[0.08] bg-[#0f0f0f] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
