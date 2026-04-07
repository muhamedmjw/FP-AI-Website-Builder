"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Clock3, Pencil, RotateCcw, X } from "lucide-react";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";

type VersionHistoryItem = {
  id: string;
  version: number;
  label: string | null;
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
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [labelError, setLabelError] = useState("");
  const [savingLabelId, setSavingLabelId] = useState<string | null>(null);
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

  function handleStartEditing(item: VersionHistoryItem) {
    setEditingVersionId(item.id);
    setEditingValue(item.label ?? "");
    setLabelError("");
    setErrorMessage("");
  }

  function handleCancelEditing() {
    if (savingLabelId) return;
    setEditingVersionId(null);
    setEditingValue("");
    setLabelError("");
  }

  async function handleSaveLabel(item: VersionHistoryItem) {
    if (savingLabelId) return;

    const trimmedLabel = editingValue.trim();

    if (!trimmedLabel) {
      setLabelError("Label cannot be empty");
      return;
    }

    setSavingLabelId(item.id);
    setLabelError("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/website/version-label", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          versionId: item.id,
          label: trimmedLabel,
          chatId,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        label?: unknown;
        error?: unknown;
      };

      if (!response.ok || data.success !== true || typeof data.label !== "string") {
        const message =
          typeof data.error === "string" ? data.error : t("saveError", language);
        throw new Error(message);
      }

      setVersions((previousVersions) =>
        previousVersions.map((version) =>
          version.id === item.id ? { ...version, label: data.label as string } : version
        )
      );
      setEditingVersionId(null);
      setEditingValue("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("saveError", language));
    } finally {
      setSavingLabelId(null);
    }
  }

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
                const isEditing = editingVersionId === item.id;
                const isSavingLabel = savingLabelId === item.id;

                return (
                  <li
                    key={item.id}
                    className="group rounded-xl border border-[var(--app-border)] bg-[var(--app-panel-soft)] px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(event) => {
                                setEditingValue(event.target.value);
                                if (labelError) {
                                  setLabelError("");
                                }
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  void handleSaveLabel(item);
                                }

                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  handleCancelEditing();
                                }
                              }}
                              maxLength={60}
                              placeholder={t("versionLabelPlaceholder", language)}
                              autoFocus
                              disabled={isSavingLabel}
                              className="w-full rounded-lg border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-2.5 py-1.5 text-sm text-[var(--app-input-text)] focus:border-[var(--app-input-focus-border)] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => void handleSaveLabel(item)}
                              disabled={isSavingLabel}
                              className="flex items-center justify-center rounded-lg bg-emerald-500/15 px-2 py-1.5 text-emerald-400 transition hover:bg-emerald-500/20 disabled:pointer-events-none disabled:opacity-60"
                              title={
                                isSavingLabel
                                  ? t("renamingVersion", language)
                                  : t("saveChanges", language)
                              }
                            >
                              {isSavingLabel ? (
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                              ) : (
                                <Check size={13} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditing}
                              disabled={isSavingLabel}
                              className="flex items-center justify-center rounded-lg bg-[var(--app-hover-bg)] px-2 py-1.5 text-[var(--app-text-tertiary)] transition hover:text-[var(--app-text-secondary)] disabled:pointer-events-none disabled:opacity-60"
                              title={t("cancel", language)}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {item.label ? (
                              <>
                                <p className="truncate text-sm font-semibold text-[var(--app-text-heading)]">
                                  {item.label}
                                </p>
                                <span className="rounded-full bg-[var(--app-hover-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--app-text-tertiary)]">
                                  v{item.version}
                                </span>
                              </>
                            ) : (
                              <p className="text-sm text-[var(--app-text-tertiary)]">
                                {t("version", language)} v{item.version}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => handleStartEditing(item)}
                              className={`flex h-5 w-5 items-center justify-center rounded-md text-[var(--app-text-tertiary)] transition hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)] ${
                                item.label
                                  ? "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                                  : "opacity-100"
                              }`}
                              title={t("rename", language)}
                              aria-label={t("rename", language)}
                            >
                              <Pencil size={12} />
                            </button>
                            {isCurrent ? (
                              <span className="rounded-full bg-[var(--app-hover-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--app-text-secondary)]">
                                {t("current", language)}
                              </span>
                            ) : null}
                          </div>
                        )}
                        {isEditing && labelError ? (
                          <p className="mt-1 text-xs text-rose-400" role="alert">
                            {labelError}
                          </p>
                        ) : null}
                        <p className="mt-1 flex items-center gap-1 text-xs text-[var(--app-text-tertiary)]">
                          <Clock3 size={12} />
                          {new Date(item.created_at).toLocaleString(locale)}
                        </p>
                      </div>
                      {!isEditing ? (
                        <button
                          type="button"
                          onClick={() => void handleRestore(item.id)}
                          disabled={isRestoring}
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-2.5 text-xs font-medium text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)] disabled:pointer-events-none disabled:opacity-60"
                        >
                          <RotateCcw size={13} />
                          {isRestoring ? t("restoring", language) : t("restore", language)}
                        </button>
                      ) : null}
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
