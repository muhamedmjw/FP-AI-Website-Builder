"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import GradientMesh from "@/client/components/ui/gradient-mesh";
import LanguageSwitcher from "@/client/components/ui/language-switcher";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";

/**
 * Landing page - always shows the public/guest marketing view.
 * Authenticated users are directed to / by the proxy,
 * so this component never needs to check auth state.
 */
export default function LandingView() {
  const { language } = useLanguage();

  return (
    <main className="relative min-h-screen overflow-hidden bg-(--app-bg) text-(--app-text-primary)">
      <GradientMesh />
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <LanguageSwitcher />
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 pb-6 pt-20 sm:max-w-xl sm:px-6 sm:pb-8 sm:pt-24">
        <div className="-mt-10 flex flex-col items-center justify-center text-center sm:-mt-8">
          <Sparkles size={42} strokeWidth={1.8} className="prismatic-icon" aria-hidden="true" />
          <div className="mt-5 prismatic-text text-base font-semibold uppercase tracking-[0.2em] sm:text-lg">
            <span style={{ fontFamily: "var(--font-ui)", fontWeight: 700, letterSpacing: "0.15em" }}>AI Website Builder</span>
          </div>

          <h1 className="mt-7 max-w-2xl text-balance text-3xl font-semibold leading-[1.08] text-(--app-text-heading) sm:text-4xl md:w-152 md:max-w-none">
            {t("accountHeroTitle", language)}
          </h1>
          <p className="mt-4 max-w-xl text-balance text-base text-(--app-text-secondary) sm:text-lg">
            {t("authSubtitle", language)}
          </p>
        </div>

        <div className="mt-8 w-full space-y-2.5 pb-1 sm:mt-9 sm:pb-2">
          <div className="grid grid-cols-2 gap-2.5">
            <Link
              className="inline-flex h-13 items-center justify-center rounded-full bg-(--app-btn-primary-bg) px-5 text-base font-semibold text-(--app-btn-primary-text) shadow-(--app-shadow-md) transition hover:bg-(--app-btn-primary-hover)"
              href="/signin"
            >
              {t("signIn", language)}
            </Link>
            <Link
              className="inline-flex h-13 items-center justify-center rounded-full border border-white/20 bg-black/25 px-4 text-base font-medium text-(--app-text-heading) backdrop-blur-sm transition hover:border-white/35 hover:bg-black/35"
              href="/signup"
            >
              {t("signUp", language)}
            </Link>
          </div>

          <Link
            className="inline-flex h-13 w-full items-center justify-center rounded-full border border-white/20 bg-black/20 px-6 text-base font-medium text-(--app-text-heading) backdrop-blur-sm transition hover:border-white/35 hover:bg-black/35"
            href="/guest"
          >
            {t("continueAsGuest", language)}
          </Link>
        </div>
      </div>
    </main>
  );
}
