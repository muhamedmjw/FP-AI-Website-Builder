"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import GradientMesh from "@/client/components/ui/gradient-mesh";
import LanguageSwitcher from "@/client/components/ui/language-switcher";
import { useLanguage } from "@/client/lib/language-context";
import { RTL_LANGUAGES } from "@/shared/constants/languages";
import { t } from "@/shared/constants/translations";

type PageShellProps = {
  children: ReactNode;
};

export default function PageShell({ children }: PageShellProps) {
  const { language } = useLanguage();
  const isRtl = RTL_LANGUAGES.includes(language);

  return (
    <main className="relative w-full min-h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--app-text-primary)]">
      <GradientMesh />
      <div className="absolute right-4 top-4 z-20">
        <LanguageSwitcher />
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <section className={`space-y-3 text-center sm:space-y-4 ${isRtl ? "lg:text-right" : "lg:text-left"}`}>
            <Link
              href="/"
              className="prismatic-text inline-flex items-center gap-2.5 text-lg font-semibold uppercase tracking-[0.3em] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:text-xl"
            >
              <Sparkles size={24} strokeWidth={1.8} className="prismatic-icon" aria-hidden="true" />
              <span style={{ fontFamily: "var(--font-logo)" }}>AI Website Builder</span>
            </Link>
            <h1 className="text-2xl font-semibold leading-tight text-[var(--app-text-heading)] sm:text-4xl">{t("welcomeBackTitle", language)}</h1>
            <p className="text-sm text-[var(--app-text-secondary)] sm:text-base">{t("welcomeBackSubtitle", language)}</p>
            <ul className="hidden space-y-2 text-sm text-[var(--app-text-tertiary)] sm:block">
              <li>{t("authFeatureOne", language)}</li>
              <li>{t("authFeatureTwo", language)}</li>
              <li>{t("authFeatureThree", language)}</li>
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
