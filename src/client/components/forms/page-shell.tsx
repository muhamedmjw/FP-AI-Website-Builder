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
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <section className="space-y-3 text-center sm:space-y-4 lg:text-left">
            <p className="prismatic-text text-xs font-semibold uppercase tracking-[0.3em] sm:text-sm">AI Website Builder</p>
            <h1 className="text-2xl font-semibold leading-tight text-[var(--app-text-heading)] sm:text-4xl">{title}</h1>
            <p className="text-sm text-[var(--app-text-secondary)] sm:text-base">{subtitle}</p>
            <ul className="hidden space-y-2 text-sm text-[var(--app-text-tertiary)] sm:block">
              <li>Generate a full website structure from a short prompt.</li>
              <li>Save multiple chats and revisit your history.</li>
              <li>Export ready-to-run code templates.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-[var(--app-card-border)] bg-[var(--app-panel)] p-5 shadow-[var(--app-shadow-lg)] sm:rounded-3xl sm:p-8">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
