"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Chat } from "@/shared/types/database";

/**
 * A single chat item in the sidebar with an actions menu
 * for renaming and deleting.
 */

type ChatListItemProps = {
  chat: Chat;
  isActive: boolean;
  onRename: (chatId: string, newTitle: string) => Promise<void>;
  onDelete: (chatId: string) => Promise<void>;
};

export default function ChatListItem({
  chat,
  isActive,
  onRename,
  onDelete,
}: ChatListItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = `chat-actions-${chat.id}`;

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

  async function handleDelete() {
    setMenuOpen(false);

    const confirmed = window.confirm(
      `Delete "${chat.title}"? This cannot be undone.`
    );

    if (confirmed) {
      await onDelete(chat.id);
    }
  }

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
    <div className="group relative">
      <Link
        href={`/chat/${chat.id}`}
        className={`ui-fade-up block rounded-xl px-3.5 py-3 pr-9 text-base ${
          isActive
            ? "bg-[var(--app-hover-bg-strong)] text-[var(--app-text-heading)] shadow-[var(--app-shadow-sm)]"
            : "text-[var(--app-text-secondary)] hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)]"
        }`}
      >
        <p className="truncate text-[15px] font-semibold">{chat.title}</p>
        <p className="mt-0.5 truncate text-xs uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
          {new Date(chat.updated_at).toLocaleDateString()}
        </p>
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
        className={`absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-[var(--app-text-tertiary)] transition-[background-color,color] duration-75 ease-out hover:bg-[var(--app-hover-bg-strong)] hover:text-[var(--app-text-heading)]`}
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
          className="absolute right-0 top-full z-50 mt-1.5 w-40 overflow-hidden rounded-xl border border-[var(--app-card-border)] bg-[var(--app-dropdown-bg)] shadow-[var(--app-shadow-lg)]"
        >
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setEditValue(chat.title);
              setIsEditing(true);
            }}
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)]"
          >
            <Pencil size={13} />
            Rename
          </button>
          <button
            type="button"
            onClick={handleDelete}
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-rose-400 transition hover:bg-[var(--app-hover-bg)] hover:text-rose-300"
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
