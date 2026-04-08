"use client";

import { createPortal } from "react-dom";
import { Check, ExternalLink, PencilLine, RefreshCw, X } from "lucide-react";
import { t } from "@/shared/constants/translations";
import type { AppLanguage } from "@/shared/types/database";

export type DeploymentModalRow = {
  websiteId: string;
  chatId: string | null;
  websiteName: string;
  deployUrl: string | null;
  status: string;
  deployCount: number;
  firstDeployedAt: string;
  lastDeployedAt: string;
  updatedAt: string;
  netlifySiteId: string | null;
};

type DeploymentsModalProps = {
  isOpen: boolean;
  language: AppLanguage;
  isLoading: boolean;
  deploymentsError: string;
  deployments: DeploymentModalRow[];
  editingWebsiteId: string | null;
  editingWebsiteName: string;
  renamingWebsiteId: string | null;
  settingsOverlayClass: string;
  deploymentsModalClass: string;
  settingsTitleClass: string;
  settingsSubtitleClass: string;
  closeButtonClass: string;
  onClose: () => void;
  onRefresh: () => void;
  setEditingWebsiteName: (value: string) => void;
  onSaveWebsiteName: (row: DeploymentModalRow) => void;
  onCancelRename: () => void;
  onStartRename: (row: DeploymentModalRow) => void;
  formatDateTime: (value: string) => string;
  getDeploymentStatusClass: (status: string) => string;
};

export default function DeploymentsModal({
  isOpen,
  language,
  isLoading,
  deploymentsError,
  deployments,
  editingWebsiteId,
  editingWebsiteName,
  renamingWebsiteId,
  settingsOverlayClass,
  deploymentsModalClass,
  settingsTitleClass,
  settingsSubtitleClass,
  closeButtonClass,
  onClose,
  onRefresh,
  setEditingWebsiteName,
  onSaveWebsiteName,
  onCancelRename,
  onStartRename,
  formatDateTime,
  getDeploymentStatusClass,
}: DeploymentsModalProps) {
  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className={settingsOverlayClass}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={deploymentsModalClass}>
        <div className="flex items-center justify-between gap-3 border-b border-[var(--app-card-border)] px-6 py-4">
          <div>
            <h3 className={settingsTitleClass}>{t("deployedWebsitesTitle", language)}</h3>
            <p className={settingsSubtitleClass}>{t("deployedWebsitesSubtitle", language)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--app-hover-bg)] px-3 py-2 text-xs font-medium text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg-strong)]"
            >
              <RefreshCw size={14} />
              {t("refresh", language)}
            </button>
            <button type="button" onClick={onClose} className={closeButtonClass} title={t("close", language)}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(90vh-90px)] overflow-y-auto px-6 py-5">
          {isLoading ? (
            <p className="text-sm text-[var(--app-text-secondary)]">{t("loadingDeployedWebsites", language)}</p>
          ) : deployments.length === 0 ? (
            <div className="rounded-xl border border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-6 text-center text-sm text-[var(--app-text-secondary)]">
              {t("noDeployedWebsites", language)}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--app-card-border)] bg-[var(--app-card-bg)]">
              <table className="min-w-full text-sm">
                <thead className="border-b border-[var(--app-card-border)] bg-[var(--app-hover-bg)]/70 text-left text-xs uppercase tracking-wide text-[var(--app-text-tertiary)]">
                  <tr>
                    <th className="px-4 py-3">{t("websiteName", language)}</th>
                    <th className="px-4 py-3">{t("deploymentDomain", language)}</th>
                    <th className="px-4 py-3">{t("lastUpdated", language)}</th>
                    <th className="px-4 py-3">{t("deployedAt", language)}</th>
                    <th className="px-4 py-3">{t("deployStatus", language)}</th>
                    <th className="px-4 py-3">{t("deployCount", language)}</th>
                    <th className="px-4 py-3">{t("netlifySiteId", language)}</th>
                    <th className="px-4 py-3">{t("actions", language)}</th>
                  </tr>
                </thead>
                <tbody>
                  {deployments.map((row) => {
                    const isEditing = editingWebsiteId === row.websiteId;
                    const isRenaming = renamingWebsiteId === row.websiteId;

                    return (
                      <tr
                        key={row.websiteId}
                        className="border-b border-[var(--app-card-border)]/70 text-[var(--app-text-secondary)] last:border-b-0"
                      >
                        <td className="px-4 py-3 align-top">
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editingWebsiteName}
                                onChange={(event) => setEditingWebsiteName(event.target.value)}
                                className="w-full rounded-lg border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 py-2 text-sm text-[var(--app-input-text)] focus:border-[var(--app-input-focus-border)] focus:outline-none"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onSaveWebsiteName(row)}
                                  disabled={isRenaming}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--app-btn-primary-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--app-btn-primary-text)] transition hover:bg-[var(--app-btn-primary-hover)] disabled:opacity-60"
                                >
                                  <Check size={12} />
                                  {isRenaming
                                    ? `${t("saveChanges", language)}...`
                                    : t("saveChanges", language)}
                                </button>
                                <button
                                  type="button"
                                  onClick={onCancelRename}
                                  className="rounded-md bg-[var(--app-hover-bg)] px-2.5 py-1.5 text-xs text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg-strong)]"
                                >
                                  {t("cancel", language)}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="font-semibold text-[var(--app-text-heading)]">{row.websiteName}</p>
                              <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                                {t("firstDeployed", language)}: {formatDateTime(row.firstDeployedAt)}
                              </p>
                            </>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {row.deployUrl ? (
                            <a
                              href={row.deployUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex max-w-[220px] items-center gap-1.5 truncate text-[var(--app-text-heading)] hover:underline"
                            >
                              <span className="truncate">{row.deployUrl}</span>
                              <ExternalLink size={12} className="shrink-0" />
                            </a>
                          ) : (
                            <span className="text-[var(--app-text-muted)]">-</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-xs">{formatDateTime(row.updatedAt)}</td>
                        <td className="px-4 py-3 text-xs">{formatDateTime(row.lastDeployedAt)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${getDeploymentStatusClass(
                              row.status
                            )}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-[var(--app-text-heading)]">
                          {row.deployCount}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--app-text-muted)]">
                          {row.netlifySiteId ? `${row.netlifySiteId.slice(0, 8)}...` : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {row.chatId ? (
                              <button
                                type="button"
                                onClick={() => onStartRename(row)}
                                className="inline-flex items-center gap-1 rounded-md bg-[var(--app-hover-bg)] px-2.5 py-1.5 text-xs text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg-strong)]"
                              >
                                <PencilLine size={12} />
                                {t("rename", language)}
                              </button>
                            ) : null}

                            {row.deployUrl ? (
                              <a
                                href={row.deployUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md bg-[var(--app-btn-primary-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--app-btn-primary-text)] transition hover:bg-[var(--app-btn-primary-hover)]"
                              >
                                <ExternalLink size={12} />
                                {t("open", language)}
                              </a>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {deploymentsError ? <p className="mt-4 text-sm text-rose-400">{deploymentsError}</p> : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
