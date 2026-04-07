"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Archive, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Chat } from "@/shared/types/database";
import { getSupabaseBrowserClient } from "@/client/lib/supabase-browser";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";

/**
 * A single chat item in the sidebar with an actions menu
 * for renaming and deleting.
 */

type ChatListItemProps = {
  chat: Chat;
  isActive: boolean;
  isPendingGeneration?: boolean;
  onRename: (chatId: string, newTitle: string) => Promise<void>;
  onArchive: (chatId: string) => Promise<void>;
  onDelete: (
    chatId: string,
    options?: { unpublishLiveSite?: boolean }
  ) => Promise<void>;
};

export default function ChatListItem({
  chat,
  isActive,
  isPendingGeneration = false,
  onRename,
  onArchive,
  onDelete,
}: ChatListItemProps) {
  const { language } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCheckingDeleteContext, setIsCheckingDeleteContext] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");
  const [hasLiveDeployment, setHasLiveDeployment] = useState(false);
  const [latestDeployUrl, setLatestDeployUrl] = useState<string | null>(null);
  const [netlifySiteId, setNetlifySiteId] = useState<string | null>(null);
  const [confirmTitleValue, setConfirmTitleValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = `chat-actions-${chat.id}`;
  const linkPaddingClass = "pr-12";
  const actionButtonSideClass = "right-2";
  const dropdownSideClass = "right-0";
  const menuTextAlignClass = "text-left";

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  // Close menu on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  async function handleRenameSubmit() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== chat.title) {
      await onRename(chat.id, trimmed);
    }
    setIsEditing(false);
  }

  async function loadDeleteContext() {
    setIsCheckingDeleteContext(true);
    setDeleteErrorMessage("");
    setHasLiveDeployment(false);
    setLatestDeployUrl(null);
    setNetlifySiteId(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: website, error: websiteError } = await supabase
        .from("websites")
        .select("id")
        .eq("chat_id", chat.id)
        .maybeSingle();

      if (websiteError) {
        throw websiteError;
      }

      if (!website?.id) {
        return;
      }

      const { data: latestDeploy, error: deployError } = await supabase
        .from("deploys")
        .select("deploy_url, netlify_site_id")
        .eq("website_id", website.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (deployError) {
        throw deployError;
      }

      const hasLiveSite = Boolean(
        latestDeploy?.netlify_site_id || latestDeploy?.deploy_url
      );

      setHasLiveDeployment(hasLiveSite);
      setLatestDeployUrl(latestDeploy?.deploy_url ?? null);
      setNetlifySiteId(latestDeploy?.netlify_site_id ?? null);
    } catch (error) {
      console.error("Failed to check deployment context:", error);
      setDeleteErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not check deployment status."
      );
    } finally {
      setIsCheckingDeleteContext(false);
    }
  }

  function handleDelete() {
    setMenuOpen(false);
    setConfirmTitleValue("");
    setDeleteErrorMessage("");
    setShowDeleteConfirm(true);
    void loadDeleteContext();
  }

  async function handleArchiveFromMenu() {
    setMenuOpen(false);
    await onArchive(chat.id);
  }

  async function handleArchiveConfirm() {
    setDeleteErrorMessage("");
    setIsArchiving(true);

    try {
      await onArchive(chat.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      setDeleteErrorMessage(
        error instanceof Error ? error.message : "Could not archive this chat."
      );
    } finally {
      setIsArchiving(false);
    }
  }

  async function handleDeleteConfirm() {
    setDeleteErrorMessage("");
    setIsDeleting(true);

    try {
      await onDelete(chat.id, { unpublishLiveSite: hasLiveDeployment });
      setShowDeleteConfirm(false);
    } catch (error) {
      setDeleteErrorMessage(
        error instanceof Error ? error.message : "Could not delete this chat."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const titleMatchesForDelete =
    confirmTitleValue.trim() === chat.title.trim();

  // Editing mode - show inline input
  if (isEditing) {
    return (
      <div className="rounded-xl bg-[var(--app-hover-bg-strong)] px-3 py-3 shadow-[var(--app-shadow-md)]">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRenameSubmit();
            if (e.key === "Escape") {
              setEditValue(chat.title);
              setIsEditing(false);
            }
          }}
          className="w-full rounded-lg bg-[var(--app-input-bg)] px-3 py-2 text-base text-[var(--app-input-text)] focus:outline-none"
        />
      </div>
    );
  }

  // Normal mode - show chat link with actions button
  return (
    <>
      <div className="group relative">
        <Link
          href={`/chat/${chat.id}`}
          className={`ui-fade-up block rounded-xl px-3.5 py-3 ${linkPaddingClass} text-base ${
            isActive
              ? "bg-[var(--app-hover-bg-strong)] text-[var(--app-text-heading)] shadow-[var(--app-shadow-sm)]"
              : "text-[var(--app-text-secondary)] hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)]"
          }`}
        >
          <p className="truncate text-[15px] font-semibold">{chat.title}</p>
          <p className="mt-0.5 truncate text-xs uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
            {new Date(chat.updated_at).toLocaleDateString()}
          </p>
          {isPendingGeneration ? (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--app-text-tertiary)]">
              <Loader2 size={11} className="animate-spin" />
              {t("generating", language)}
            </p>
          ) : null}
        </Link>

        {/* Actions button - visible on hover or when menu is open */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen((prev) => !prev);
          }}
          aria-label={`Open actions for ${chat.title}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          className={`absolute ${actionButtonSideClass} top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-[var(--app-text-tertiary)] transition-[color,opacity] duration-75 ease-out hover:text-white ${menuOpen ? "" : "md:pointer-events-none md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100"}`}
          title="Actions"
        >
          <MoreHorizontal size={14} />
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <div
            id={menuId}
            ref={menuRef}
            role="menu"
            className={`absolute ${dropdownSideClass} top-full z-50 mt-1.5 w-40 overflow-hidden rounded-xl border border-[var(--app-card-border)] bg-[var(--app-dropdown-bg)] shadow-[var(--app-shadow-lg)]`}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setEditValue(chat.title);
                setIsEditing(true);
              }}
              role="menuitem"
              className={`flex w-full items-center gap-2 px-3 py-2.5 ${menuTextAlignClass} text-sm text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)]`}
            >
              <Pencil size={13} />
              {t("rename", language)}
            </button>
            <button
              type="button"
              onClick={() => void handleArchiveFromMenu()}
              role="menuitem"
              className={`flex w-full items-center gap-2 px-3 py-2.5 ${menuTextAlignClass} text-sm text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)]`}
            >
              <Archive size={13} />
              Archive
            </button>
            <button
              type="button"
              onClick={handleDelete}
              role="menuitem"
              className={`flex w-full items-center gap-2 px-3 py-2.5 ${menuTextAlignClass} text-sm text-rose-400 transition hover:bg-[var(--app-hover-bg)] hover:text-rose-300`}
            >
              <Trash2 size={13} />
              {t("delete", language)}
            </button>
          </div>
        )}
      </div>

      {showDeleteConfirm &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-[var(--app-card-border)] bg-[var(--app-panel)] p-6 shadow-[var(--app-shadow-lg)]">
              <h3 className="text-lg font-semibold text-[var(--app-text-heading)]">
                {hasLiveDeployment ? "This chat has a live website" : "Delete chat"}
              </h3>

              {isCheckingDeleteContext ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-[var(--app-text-secondary)]">
                  <Loader2 size={15} className="animate-spin" />
                  Checking deployment status...
                </div>
              ) : hasLiveDeployment ? (
                <>
                  <p className="mt-2 text-sm text-[var(--app-text-secondary)]">
                    This project has a live Netlify site. Archive is recommended if you only want to hide it from the sidebar.
                  </p>

                  {latestDeployUrl ? (
                    <p className="mt-2 text-xs text-[var(--app-text-muted)]">
                      Live URL: {latestDeployUrl}
                    </p>
                  ) : null}

                  {netlifySiteId ? (
                    <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                      Site ID: {netlifySiteId}
                    </p>
                  ) : null}

                  <label className="mt-4 block space-y-1.5">
                    <span className="text-xs text-[var(--app-text-tertiary)]">
                      Type the chat title to confirm permanent deletion:
                    </span>
                    <input
                      type="text"
                      value={confirmTitleValue}
                      onChange={(event) => setConfirmTitleValue(event.target.value)}
                      className="w-full rounded-lg border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3 py-2 text-sm text-[var(--app-input-text)] focus:border-[var(--app-input-focus-border)] focus:outline-none"
                      placeholder={chat.title}
                    />
                  </label>
                </>
              ) : (
                <p className="mt-2 text-sm text-[var(--app-text-secondary)]">
                  {`Delete "${chat.title}"? This cannot be undone.`}
                </p>
              )}

              {deleteErrorMessage ? (
                <p className="mt-3 text-sm text-rose-400">{deleteErrorMessage}</p>
              ) : null}

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isDeleting || isArchiving) return;
                    setShowDeleteConfirm(false);
                  }}
                  className="rounded-lg bg-[var(--app-hover-bg)] px-4 py-2 text-sm text-[var(--app-text-secondary)] hover:bg-[var(--app-hover-bg-strong)]"
                >
                  {t("cancel", language)}
                </button>

                {hasLiveDeployment ? (
                  <button
                    type="button"
                    onClick={() => void handleArchiveConfirm()}
                    disabled={isDeleting || isArchiving || isCheckingDeleteContext}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--app-card-border)] bg-[var(--app-hover-bg)] px-4 py-2 text-sm text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg-strong)] disabled:opacity-60"
                  >
                    {isArchiving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Archive size={14} />
                    )}
                    Archive
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => void handleDeleteConfirm()}
                  disabled={
                    isDeleting ||
                    isArchiving ||
                    isCheckingDeleteContext ||
                    (hasLiveDeployment && !titleMatchesForDelete)
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
                >
                  {isDeleting ? <Loader2 size={14} className="animate-spin" /> : null}
                  {hasLiveDeployment ? "Delete + unpublish" : t("delete", language)}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
