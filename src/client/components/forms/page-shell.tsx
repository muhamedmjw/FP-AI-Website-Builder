import { ReactNode } from "react";
import GradientMesh from "@/client/components/ui/gradient-mesh";

type PageShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function PageShell({ title, subtitle, children }: PageShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--app-text-primary)]">
      <GradientMesh />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-12">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-4">
            <p className="prismatic-text text-sm font-semibold uppercase tracking-[0.3em]">AI Website Builder</p>
            <h1 className="text-4xl font-semibold leading-tight text-[var(--app-text-heading)]">{title}</h1>
            <p className="text-base text-[var(--app-text-secondary)]">{subtitle}</p>
            <ul className="space-y-2 text-sm text-[var(--app-text-tertiary)]">
              <li>Generate a full website structure from a short prompt.</li>
              <li>Save multiple chats and revisit your history.</li>
              <li>Export ready-to-run code templates.</li>
            </ul>
          </section>

          <section className="rounded-3xl border border-[var(--app-card-border)] bg-[var(--app-panel)] p-8 shadow-[var(--app-shadow-lg)]">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
