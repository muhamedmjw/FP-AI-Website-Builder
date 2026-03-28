"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, RotateCcw, X } from "lucide-react";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";

type VersionHistoryItem = {
  id: string;
  version: number;
  created_at: string;
};

type VersionHistoryPanelProps = {
  open: boolean;
  chatId: string;
  onClose: () => void;
  onRestored: (html: string) => void;
};

type VersionsApiResponse = {
  versions: VersionHistoryItem[];
  currentVersion: number | null;
};

export default function VersionHistoryPanel({
  open,
  chatId,
  onClose,
  onRestored,
}: VersionHistoryPanelProps) {
  const { language } = useLanguage();
  const [versions, setVersions] = useState<VersionHistoryItem[]>([]);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const locale = useMemo(() => {
    if (language === "ar") return "ar";
    if (language === "ku") return "ku";
    return "en-US";
  }, [language]);

  const loadVersions = useCallback(async () => {
    if (!chatId) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/website/versions?chatId=${encodeURIComponent(chatId)}`,
        { method: "GET" }
      );

      const data = (await response.json()) as
        | VersionsApiResponse
        | { error?: unknown };
      const apiError = (data as { error?: unknown }).error;

      if (!response.ok) {
        const message =
          typeof apiError === "string"
            ? apiError
            : t("historyLoadFailed", language);
        throw new Error(message);
      }

      setVersions((data as VersionsApiResponse).versions ?? []);
      setCurrentVersion((data as VersionsApiResponse).currentVersion ?? null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("historyLoadFailed", language)
      );
    } finally {
      setIsLoading(false);
    }
  }, [chatId, language]);

  useEffect(() => {
    if (open) {
      void loadVersions();
    }
  }, [open, loadVersions]);

  async function handleRestore(versionId: string) {
    setIsRestoringId(versionId);
    setErrorMessage("");

    try {
      const response = await fetch("/api/website/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chatId, versionId }),
      });

      const data = (await response.json()) as
        | { html: string }
        | { error?: unknown };
      const apiError = (data as { error?: unknown }).error;

      if (!response.ok || typeof (data as { html?: unknown }).html !== "string") {
        const message =
          typeof apiError === "string"
            ? apiError
            : t("restoreFailed", language);
        throw new Error(message);
      }

      onRestored((data as { html: string }).html);
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("restoreFailed", language)
      );
    } finally {
      setIsRestoringId(null);
    }
  }

  return (
    <aside
      className={`absolute inset-y-0 right-0 z-20 w-full max-w-sm border-l border-[var(--app-border)] bg-[var(--app-panel)] shadow-[-12px_0_24px_rgba(0,0,0,0.22)] transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
      aria-hidden={!open}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-[var(--app-border)] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-[var(--app-text-heading)]">
              {t("versionHistory", language)}
            </p>
            <p className="mt-0.5 text-xs text-[var(--app-text-tertiary)]">
              {t("historyCurrentVersion", language)}{" "}
              {currentVersion ? `v${currentVersion}` : "-"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--app-text-tertiary)] transition hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)]"
            title={t("close", language)}
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {isLoading ? (
            <p className="text-sm text-[var(--app-text-tertiary)]">
              {t("loadingHistory", language)}
            </p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-[var(--app-text-tertiary)]">
              {t("noVersionHistory", language)}
            </p>
          ) : (
            <ul className="space-y-2">
              {versions.map((item) => {
                const isCurrent = currentVersion === item.version;
                const isRestoring = isRestoringId === item.id;

                return (
                  <li
                    key={item.id}
                    className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel-soft)] px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--app-text-heading)]">
                          {t("version", language)} v{item.version}
                          {isCurrent ? (
                            <span className="ml-2 rounded-full bg-[var(--app-hover-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--app-text-secondary)]">
                              {t("current", language)}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-[var(--app-text-tertiary)]">
                          <Clock3 size={12} />
                          {new Date(item.created_at).toLocaleString(locale)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRestore(item.id)}
                        disabled={isRestoring}
                        className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-2.5 text-xs font-medium text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)] disabled:pointer-events-none disabled:opacity-60"
                      >
                        <RotateCcw size={13} />
                        {isRestoring ? t("restoring", language) : t("restore", language)}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {errorMessage ? (
            <p className="mt-3 text-sm text-rose-400" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
