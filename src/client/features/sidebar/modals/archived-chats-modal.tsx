"use client";

import { createPortal } from "react-dom";
import { RefreshCw, X } from "lucide-react";
import { t } from "@/shared/constants/translations";
import type { AppLanguage } from "@/shared/types/database";
import type { ArchivedChatRow } from "@/shared/types/sidebar";

export type ArchivedChatModalRow = ArchivedChatRow;

type ArchivedChatsModalProps = {
  isOpen: boolean;
  language: AppLanguage;
  isLoading: boolean;
  archivedChatsError: string;
  restoringChatId: string | null;
  archivedChats: ArchivedChatModalRow[];
  settingsOverlayClass: string;
  settingsTitleClass: string;
  settingsSubtitleClass: string;
  closeButtonClass: string;
  onClose: () => void;
  onRefresh: () => void;
  onRestoreChat: (chatId: string) => void;
  formatDateTime: (value: string) => string;
};

/**
 * Lists archived chats and allows restoring them.
 */
export default function ArchivedChatsModal({
  isOpen,
  language,
  isLoading,
  archivedChatsError,
  restoringChatId,
  archivedChats,
  settingsOverlayClass,
  settingsTitleClass,
  settingsSubtitleClass,
  closeButtonClass,
  onClose,
  onRefresh,
  onRestoreChat,
  formatDateTime,
}: ArchivedChatsModalProps) {
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
      <div className="w-full max-h-[90vh] overflow-hidden rounded-t-2xl border border-(--app-card-border) bg-(--app-panel) shadow-(--app-shadow-lg) sm:max-w-4xl sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-(--app-card-border) px-6 py-4">
          <div>
            <h3 className={settingsTitleClass}>{t("archivedChats", language)}</h3>
            <p className={settingsSubtitleClass}>{t("restoreArchivedChatsHint", language)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 rounded-lg bg-(--app-hover-bg) px-3 py-2 text-xs font-medium text-(--app-text-secondary) transition hover:bg-(--app-hover-bg-strong)"
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
            <p className="text-sm text-(--app-text-secondary)">{t("loadingArchivedChats", language)}</p>
          ) : archivedChats.length === 0 ? (
            <div className="rounded-xl border border-(--app-card-border) bg-(--app-card-bg) p-6 text-center text-sm text-(--app-text-secondary)">
              {t("noArchivedChats", language)}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-(--app-card-border) bg-(--app-card-bg)">
              <table className="min-w-full text-sm">
                <thead className="border-b border-(--app-card-border) bg-(--app-hover-bg)/70 text-left text-xs uppercase tracking-wide text-(--app-text-tertiary)">
                  <tr>
                    <th className="px-4 py-3">{t("chat", language)}</th>
                    <th className="px-4 py-3">{t("archivedAt", language)}</th>
                    <th className="px-4 py-3">{t("lastUpdated", language)}</th>
                    <th className="px-4 py-3">{t("actions", language)}</th>
                  </tr>
                </thead>

                <tbody>
                  {archivedChats.map((chat) => {
                    const isRestoring = restoringChatId === chat.id;

                    return (
                      <tr
                        key={chat.id}
                        className="border-b border-(--app-card-border)/70 text-(--app-text-secondary) last:border-b-0"
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-(--app-text-heading)">
                            {chat.title?.trim() || t("untitledWebsite", language)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {chat.archived_at ? formatDateTime(chat.archived_at) : "-"}
                        </td>
                        <td className="px-4 py-3 text-xs">{formatDateTime(chat.updated_at)}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => onRestoreChat(chat.id)}
                            disabled={isRestoring}
                            className="inline-flex items-center gap-1 rounded-md bg-(--app-btn-primary-bg) px-2.5 py-1.5 text-xs font-semibold text-(--app-btn-primary-text) transition hover:bg-(--app-btn-primary-hover) disabled:opacity-60"
                          >
                            {isRestoring ? (
                              <>
                                <RefreshCw size={12} className="animate-spin" />
                                {t("restoringDots", language)}
                              </>
                            ) : (
                              t("restoreChat", language)
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {archivedChatsError ? (
            <p className="mt-4 text-sm text-rose-400">{archivedChatsError}</p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
