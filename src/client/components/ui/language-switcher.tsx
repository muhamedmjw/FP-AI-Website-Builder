"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Languages } from "lucide-react";
import { useLanguage } from "@/client/lib/language-context";
import type { AppLanguage } from "@/shared/types/database";

type LanguageSwitcherProps = {
  iconOnly?: boolean;
};

const LANGUAGE_OPTIONS: Array<{
  code: AppLanguage;
  label: string;
}> = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "ku", label: "کوردی" },
];

export default function LanguageSwitcher({ iconOnly = false }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const currentOption =
    LANGUAGE_OPTIONS.find((option) => option.code === language) ??
    LANGUAGE_OPTIONS[0];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-card-bg)] px-2.5 text-xs font-semibold text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)]"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="Switch language"
      >
        {iconOnly ? <Languages size={14} /> : null}
        {!iconOnly ? (
          <span className={currentOption.code === "en" ? "font-medium" : "font-semibold"}>
            {currentOption.label}
          </span>
        ) : null}
        {!iconOnly ? <ChevronDown size={13} /> : null}
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 min-w-[128px] rounded-lg border border-[var(--app-border)] bg-[var(--app-card-bg)] p-1 shadow-[var(--app-shadow-lg)]"
        >
          {LANGUAGE_OPTIONS.map((option) => {
            const isActive = option.code === language;

            return (
              <button
                key={option.code}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  try {
                    window.localStorage.setItem("app-language-explicit", "true");
                  } catch {
                    // Ignore
                  }
                  setLanguage(option.code);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition ${
                  isActive
                    ? "bg-[var(--app-btn-primary-bg)] text-[var(--app-btn-primary-text)]"
                    : "text-[var(--app-text-secondary)] hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)]"
                }`}
              >
                <span className={option.code === "en" ? "font-medium" : "font-semibold"}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
