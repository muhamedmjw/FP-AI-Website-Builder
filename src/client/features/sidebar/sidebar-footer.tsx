"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Archive,
  ChevronUp,
  Globe,
  Github,
  LogOut,
  Moon,
  Settings,
  Sun,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/client/lib/supabase-browser";
import { useLanguage } from "@/client/lib/language-context";
import SettingsModal from "@/client/features/sidebar/settings-modal";
import DeploymentsModal, {
  DeploymentModalRow,
} from "@/client/features/sidebar/deployments-modal";
import ArchivedChatsModal, {
  ArchivedChatModalRow,
} from "@/client/features/sidebar/archived-chats-modal";
import { t } from "@/shared/constants/translations";
import { isMissingSessionError } from "@/shared/utils/auth-errors";
import { MAX_AVATAR_FILE_SIZE } from "@/shared/constants/limits";
import type { AppLanguage } from "@/shared/types/database";

const GITHUB_REPO_URL = "https://github.com/muhamedmjw/Final-Project";
const THEME_STORAGE_KEY = "app-theme";

type Theme = "dark" | "light";

const LANGUAGE_OPTIONS: Array<{ code: AppLanguage; label: string }> = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "ku", label: "کوردی" },
];

type SidebarFooterProps = {
  userName: string | null;
  userEmail: string | null;
  userAvatarUrl: string | null;
  /** "compact" renders just the avatar circle; "full" renders the original bar. */
  variant?: "compact" | "full";
  onProfileUpdated: (nextProfile: {
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
  }) => void;
};

type DeploymentRow = DeploymentModalRow;

type DeployRecordRow = {
  id: string;
  website_id: string;
  deploy_url: string | null;
  status: string | null;
  created_at: string;
  netlify_site_id: string | null;
};

type WebsiteSummaryRow = {
  id: string;
  chat_id: string;
  updated_at: string;
};

type ChatSummaryRow = {
  id: string;
  title: string;
  updated_at: string;
};

type ArchivedChatRow = ArchivedChatModalRow;

/**
 * Bottom sidebar account area.
 * Provides account menu actions and a centered settings modal.
 */
export default function SidebarFooter({
  userName,
  userEmail,
  userAvatarUrl,
  variant = "compact",
  onProfileUpdated,
}: SidebarFooterProps) {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();

  const menuRef = useRef<HTMLDivElement>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const languageMenuButtonRef = useRef<HTMLButtonElement>(null);
  const languageMenuPanelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deploymentsOpen, setDeploymentsOpen] = useState(false);
  const [archivedChatsOpen, setArchivedChatsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deploymentsError, setDeploymentsError] = useState("");
  const [archivedChatsError, setArchivedChatsError] = useState("");
  const [deployments, setDeployments] = useState<DeploymentRow[]>([]);
  const [isDeploymentsLoading, setIsDeploymentsLoading] = useState(false);
  const [archivedChats, setArchivedChats] = useState<ArchivedChatRow[]>([]);
  const [isArchivedChatsLoading, setIsArchivedChatsLoading] = useState(false);
  const [restoringChatId, setRestoringChatId] = useState<string | null>(null);
  const [editingWebsiteId, setEditingWebsiteId] = useState<string | null>(null);
  const [editingWebsiteName, setEditingWebsiteName] = useState("");
  const [renamingWebsiteId, setRenamingWebsiteId] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [languageMenuPosition, setLanguageMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 176,
  });

  const [nameInput, setNameInput] = useState(userName ?? "");
  const [emailInput, setEmailInput] = useState(userEmail ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    userAvatarUrl
  );
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  useEffect(() => {
    setNameInput(userName ?? "");
    setEmailInput(userEmail ?? "");
    setAvatarPreview(userAvatarUrl);
    setAvatarLoadError(false);
  }, [userName, userEmail, userAvatarUrl]);

  useEffect(() => {
    const root = document.documentElement;
    const rootTheme = root.getAttribute("data-theme");
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const prefersLight = window.matchMedia(
      "(prefers-color-scheme: light)"
    ).matches;

    const nextTheme: Theme =
      savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : rootTheme === "light" || rootTheme === "dark"
          ? rootTheme
          : prefersLight
            ? "light"
            : "dark";

    root.setAttribute("data-theme", nextTheme);
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }

      if (
        languageMenuRef.current &&
        !languageMenuRef.current.contains(event.target as Node) &&
        (!languageMenuPanelRef.current ||
          !languageMenuPanelRef.current.contains(event.target as Node))
      ) {
        setIsLanguageMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSettingsOpen(false);
        setDeploymentsOpen(false);
        setArchivedChatsOpen(false);
        setIsLanguageMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!settingsOpen) {
      setIsLanguageMenuOpen(false);
    }
  }, [settingsOpen]);

  useEffect(() => {
    if (!deploymentsOpen) {
      setEditingWebsiteId(null);
      setEditingWebsiteName("");
    }
  }, [deploymentsOpen]);

  useEffect(() => {
    if (!archivedChatsOpen) {
      setRestoringChatId(null);
    }
  }, [archivedChatsOpen]);

  useEffect(() => {
    if (!isLanguageMenuOpen) return;

    const updateLanguageMenuPosition = () => {
      const trigger = languageMenuButtonRef.current;
      if (!trigger) return;

      const VIEWPORT_MARGIN = 8;
      const MENU_GAP = 6;
      const MAX_MENU_HEIGHT = 176;

      const rect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
      const maxHeight = Math.max(48, Math.min(MAX_MENU_HEIGHT, spaceBelow));
      const top = Math.max(
        VIEWPORT_MARGIN,
        Math.min(
          rect.bottom + MENU_GAP,
          window.innerHeight - VIEWPORT_MARGIN - maxHeight
        )
      );

      setLanguageMenuPosition({
        top,
        left: rect.left,
        width: rect.width,
        maxHeight,
      });
    };

    updateLanguageMenuPosition();
    window.addEventListener("resize", updateLanguageMenuPosition);
    window.addEventListener("scroll", updateLanguageMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateLanguageMenuPosition);
      window.removeEventListener("scroll", updateLanguageMenuPosition, true);
    };
  }, [isLanguageMenuOpen]);

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Could not read selected file."));
      reader.readAsDataURL(file);
    });
  }

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      setErrorMessage(t("imageSmallerThan2MB", language));
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setAvatarPreview(dataUrl);
      setAvatarLoadError(false);
      setErrorMessage("");
    } catch (error) {
      console.error("Failed to read avatar file:", error);
      setErrorMessage(t("couldNotUseImage", language));
    } finally {
      event.target.value = "";
    }
  }

  function handleRemoveAvatar() {
    setAvatarPreview(null);
    setAvatarLoadError(false);
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    setMenuOpen(false);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();

      if (error && !isMissingSessionError(error)) throw error;

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Failed to sign out:", error);
    } finally {
      setIsSigningOut(false);
    }
  }

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextName = nameInput.trim();
    const nextEmail = emailInput.trim();

    if (!nextName) {
      setErrorMessage(t("nameRequired", language));
      return;
    }

    if (!nextEmail) {
      setErrorMessage(t("emailRequired", language));
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(t("sessionExpiredPleaseSignInAgain", language));
      }

      const updatePayload: {
        email?: string;
        data: { display_name: string; avatar_url: null };
      } = {
        data: {
          display_name: nextName,
          // Keep avatar out of auth metadata to avoid oversized auth cookies.
          avatar_url: null,
        },
      };

      const currentEmail = user.email?.trim().toLowerCase() ?? "";
      if (nextEmail.toLowerCase() !== currentEmail) {
        updatePayload.email = nextEmail;
      }

      const { error: authError } = await supabase.auth.updateUser(updatePayload);
      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from("users")
        .upsert(
          {
            id: user.id,
            name: nextName,
            email: nextEmail,
            avatar_url: avatarPreview,
          },
          { onConflict: "id" }
        );

      if (profileError) throw profileError;

      onProfileUpdated({
        name: nextName,
        email: nextEmail,
        avatarUrl: avatarPreview,
      });

      setSettingsOpen(false);
      setMenuOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to update profile:", error);
      setErrorMessage(
        error instanceof Error ? error.message : t("couldNotSaveChanges", language)
      );
    } finally {
      setIsSaving(false);
    }
  }

  function formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    const locale =
      language === "ar" ? "ar" : language === "ku" ? "ku-Arab-IQ" : "en";

    return date.toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getDeploymentStatusClass(status: string): string {
    const normalized = status.trim().toLowerCase();

    if (normalized === "ready" || normalized === "published") {
      return "bg-emerald-500/15 text-emerald-400";
    }

    if (normalized === "error" || normalized === "failed") {
      return "bg-rose-500/15 text-rose-400";
    }

    return "bg-amber-500/15 text-amber-300";
  }

  async function loadDeployments() {
    setIsDeploymentsLoading(true);
    setDeploymentsError("");

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(t("sessionExpiredPleaseSignInAgain", language));
      }

      const { data: deployData, error: deployError } = await supabase
        .from("deploys")
        .select("id, website_id, deploy_url, status, created_at, netlify_site_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (deployError) throw deployError;

      const deployRecords = (deployData ?? []) as DeployRecordRow[];

      if (deployRecords.length === 0) {
        setDeployments([]);
        return;
      }

      const groupedByWebsite = new Map<
        string,
        {
          latest: DeployRecordRow;
          firstDeployedAt: string;
          deployCount: number;
        }
      >();

      for (const record of deployRecords) {
        if (!record.website_id) continue;

        const existing = groupedByWebsite.get(record.website_id);
        if (!existing) {
          groupedByWebsite.set(record.website_id, {
            latest: record,
            firstDeployedAt: record.created_at,
            deployCount: 1,
          });
          continue;
        }

        existing.deployCount += 1;
        existing.firstDeployedAt = record.created_at;
      }

      const websiteIds = [...groupedByWebsite.keys()];
      if (websiteIds.length === 0) {
        setDeployments([]);
        return;
      }

      const { data: websitesData, error: websitesError } = await supabase
        .from("websites")
        .select("id, chat_id, updated_at")
        .in("id", websiteIds);

      if (websitesError) throw websitesError;

      const websites = (websitesData ?? []) as WebsiteSummaryRow[];
      const websiteById = new Map(websites.map((website) => [website.id, website]));

      const chatIds = websites.map((website) => website.chat_id).filter(Boolean);
      const uniqueChatIds = [...new Set(chatIds)];

      let chatsById = new Map<string, ChatSummaryRow>();

      if (uniqueChatIds.length > 0) {
        const { data: chatsData, error: chatsError } = await supabase
          .from("chats")
          .select("id, title, updated_at")
          .in("id", uniqueChatIds);

        if (chatsError) throw chatsError;

        chatsById = new Map(
          ((chatsData ?? []) as ChatSummaryRow[]).map((chat) => [chat.id, chat])
        );
      }

      const nextRows = websiteIds
        .map((websiteId) => {
          const grouped = groupedByWebsite.get(websiteId);
          if (!grouped) return null;

          const website = websiteById.get(websiteId);
          const chat = website?.chat_id ? chatsById.get(website.chat_id) : null;

          const websiteName =
            chat?.title?.trim() || t("untitledWebsite", language);

          const updatedAt =
            website?.updated_at ?? chat?.updated_at ?? grouped.latest.created_at;

          return {
            websiteId,
            chatId: website?.chat_id ?? null,
            websiteName,
            deployUrl: grouped.latest.deploy_url,
            status: grouped.latest.status ?? "unknown",
            deployCount: grouped.deployCount,
            firstDeployedAt: grouped.firstDeployedAt,
            lastDeployedAt: grouped.latest.created_at,
            updatedAt,
            netlifySiteId: grouped.latest.netlify_site_id,
          } satisfies DeploymentRow;
        })
        .filter((row): row is DeploymentRow => row !== null)
        .sort(
          (a, b) =>
            new Date(b.lastDeployedAt).getTime() -
            new Date(a.lastDeployedAt).getTime()
        );

      setDeployments(nextRows);
    } catch (error) {
      console.error("Failed to load deployed websites:", error);
      setDeploymentsError(
        error instanceof Error
          ? error.message
          : t("deploymentsLoadFailed", language)
      );
    } finally {
      setIsDeploymentsLoading(false);
    }
  }

  function handleOpenDeployments() {
    setMenuOpen(false);
    setDeploymentsOpen(true);
    setDeploymentsError("");
    void loadDeployments();
  }

  async function loadArchivedChats() {
    setIsArchivedChatsLoading(true);
    setArchivedChatsError("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("chats")
        .select("id, title, updated_at, archived_at")
        .not("archived_at", "is", null)
        .order("archived_at", { ascending: false });

      if (error) {
        const maybeMissingArchivedColumn =
          typeof error.message === "string" &&
          error.message.toLowerCase().includes("archived_at") &&
          error.message.toLowerCase().includes("column");

        if (maybeMissingArchivedColumn) {
          throw new Error(
            t("archiveSupportUnavailable", language)
          );
        }

        throw error;
      }

      setArchivedChats(((data ?? []) as ArchivedChatRow[]).sort((a, b) => {
        const aTime = a.archived_at ? new Date(a.archived_at).getTime() : 0;
        const bTime = b.archived_at ? new Date(b.archived_at).getTime() : 0;
        return bTime - aTime;
      }));
    } catch (error) {
      console.error("Failed to load archived chats:", error);
      setArchivedChatsError(
        error instanceof Error
          ? error.message
          : t("archivedChatsLoadFailed", language)
      );
    } finally {
      setIsArchivedChatsLoading(false);
    }
  }

  function handleOpenArchivedChats() {
    setMenuOpen(false);
    setArchivedChatsOpen(true);
    setArchivedChatsError("");
    void loadArchivedChats();
  }

  async function handleRestoreArchivedChat(chatId: string) {
    setRestoringChatId(chatId);
    setArchivedChatsError("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("chats")
        .update({ archived_at: null })
        .eq("id", chatId);

      if (error) {
        throw error;
      }

      setArchivedChats((prev) => prev.filter((chat) => chat.id !== chatId));
      router.refresh();
    } catch (error) {
      console.error("Failed to restore archived chat:", error);
      setArchivedChatsError(
        error instanceof Error
          ? error.message
          : t("couldNotRestoreChat", language)
      );
    } finally {
      setRestoringChatId(null);
    }
  }

  function handleStartRename(row: DeploymentRow) {
    if (!row.chatId) return;
    setEditingWebsiteId(row.websiteId);
    setEditingWebsiteName(row.websiteName);
  }

  async function handleSaveWebsiteName(row: DeploymentRow) {
    if (!row.chatId) return;

    const nextName = editingWebsiteName.trim();
    if (!nextName) {
      setDeploymentsError(t("websiteNameRequired", language));
      return;
    }

    setRenamingWebsiteId(row.websiteId);
    setDeploymentsError("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("chats")
        .update({ title: nextName })
        .eq("id", row.chatId);

      if (error) throw error;

      setDeployments((prev) =>
        prev.map((entry) =>
          entry.websiteId === row.websiteId
            ? {
                ...entry,
                websiteName: nextName,
                updatedAt: new Date().toISOString(),
              }
            : entry
        )
      );

      setEditingWebsiteId(null);
      setEditingWebsiteName("");
    } catch (error) {
      console.error("Failed to rename deployed website:", error);
      setDeploymentsError(
        error instanceof Error
          ? error.message
          : t("couldNotSaveChanges", language)
      );
    } finally {
      setRenamingWebsiteId(null);
    }
  }

  const accountLabel = userName?.trim() || userEmail?.trim() || t("account", language);
  const initials =
    accountLabel.length > 0 ? accountLabel.charAt(0).toUpperCase() : "A";
  const isLightTheme = theme === "light";

  function handleThemeToggle() {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  const currentLanguageOption =
    LANGUAGE_OPTIONS.find((option) => option.code === language) ?? LANGUAGE_OPTIONS[0];

  const avatarFallbackClass =
    "flex h-9 w-9 items-center justify-center rounded-full bg-[var(--app-hover-bg-strong)] text-sm font-semibold text-[var(--app-text-heading)]";
  const menuPanelClass =
    "absolute right-0 top-full z-[90] mt-2 w-56 overflow-hidden rounded-xl border border-[var(--app-card-border)] bg-[var(--app-dropdown-bg)] shadow-[var(--app-shadow-lg)] md:bottom-full md:left-0 md:right-auto md:top-auto md:mb-2 md:mt-0 md:w-48";
  const menuItemClass =
    "cursor-pointer flex w-full items-center gap-2.5 whitespace-nowrap px-3.5 py-3 text-sm text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)]";
  const signOutItemClass =
    "cursor-pointer flex w-full items-center gap-2.5 px-3.5 py-3 text-sm text-rose-400 transition hover:bg-[var(--app-hover-bg)] hover:text-rose-300";
  const settingsOverlayClass =
    "fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4";
  const settingsModalClass =
    "w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-[var(--app-card-border)] bg-[var(--app-panel)] shadow-[var(--app-shadow-lg)] sm:max-w-xl sm:rounded-2xl";
  const deploymentsModalClass =
    "w-full max-h-[90vh] overflow-hidden rounded-t-2xl border border-[var(--app-card-border)] bg-[var(--app-panel)] shadow-[var(--app-shadow-lg)] sm:max-w-6xl sm:rounded-2xl";
  const settingsTitleClass =
    "text-lg font-semibold text-[var(--app-text-heading)]";
  const settingsSubtitleClass =
    "text-sm text-[var(--app-text-tertiary)]";
  const closeButtonClass =
    "rounded-lg p-2 text-[var(--app-text-tertiary)] transition hover:bg-[var(--app-hover-bg-strong)] hover:text-[var(--app-text-heading)]";
  const avatarPlaceholderClass =
    "flex h-16 w-16 items-center justify-center rounded-full border border-[var(--app-card-border)] bg-[var(--app-input-bg)] text-[var(--app-text-tertiary)]";
  const secondaryActionButtonClass =
    "inline-flex items-center gap-2 rounded-lg bg-[var(--app-hover-bg)] px-3 py-2 text-sm text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg-strong)]";
  const removeActionButtonClass =
    "rounded-lg bg-[var(--app-hover-bg)] px-3 py-2 text-sm text-[var(--app-text-tertiary)] transition hover:bg-[var(--app-hover-bg-strong)]";
  const inputLabelClass =
    "text-sm font-medium text-[var(--app-text-secondary)]";
  const inputClass =
    "w-full rounded-lg border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-3.5 py-2.5 text-base text-[var(--app-input-text)] focus:outline-none focus:border-[var(--app-input-focus-border)]";
  const selectInputClass = `${inputClass} appearance-none pr-10`;
  const cancelButtonClass =
    "rounded-lg bg-[var(--app-hover-bg)] px-4 py-2.5 text-sm text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg-strong)]";

  return (
    <>
      <div className="relative" ref={menuRef}>
        {variant === "compact" ? (
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            disabled={isSigningOut}
            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            title={t("account", language)}
          >
            {avatarPreview && !avatarLoadError ? (
              <img
                src={avatarPreview}
                alt="Account avatar"
                loading="lazy"
                onError={() => setAvatarLoadError(true)}
                className="h-9 w-9 rounded-full object-cover border border-[var(--app-card-border)]"
              />
            ) : (
              <div className={avatarFallbackClass}>
                {initials}
              </div>
            )}
          </button>
        ) : (
          <div className="px-4 py-4">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              disabled={isSigningOut}
              className="flex h-12 w-full items-center gap-3 rounded-xl bg-[var(--app-hover-bg)] px-3 text-left transition hover:bg-[var(--app-hover-bg-strong)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              title={t("account", language)}
            >
              {avatarPreview && !avatarLoadError ? (
                <img
                  src={avatarPreview}
                  alt="Account avatar"
                  loading="lazy"
                  onError={() => setAvatarLoadError(true)}
                  className="h-8 w-8 rounded-full object-cover border border-[var(--app-card-border)]"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--app-hover-bg-strong)] text-sm font-semibold text-[var(--app-text-heading)]">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--app-text-heading)]">{accountLabel}</p>
                <p className="truncate text-xs text-[var(--app-text-tertiary)]">{t("account", language)}</p>
              </div>
              <ChevronUp size={16} className={`text-[var(--app-text-tertiary)] transition ${menuOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        )}

        {menuOpen && (
          <div
            role="menu"
            className={variant === "compact" ? menuPanelClass : "absolute bottom-full left-4 right-4 z-[90] mb-2 overflow-hidden rounded-xl border border-[var(--app-card-border)] bg-[var(--app-dropdown-bg)] shadow-[var(--app-shadow-lg)]"}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setErrorMessage("");
                setSettingsOpen(true);
              }}
              role="menuitem"
              className={menuItemClass}
            >
              <Settings size={15} />
              {t("settings", language)}
            </button>

            <button
              type="button"
              onClick={handleOpenDeployments}
              role="menuitem"
              className={menuItemClass}
            >
              <Globe size={15} />
              {t("deployedWebsites", language)}
            </button>

            <button
              type="button"
              onClick={handleOpenArchivedChats}
              role="menuitem"
              className={menuItemClass}
            >
              <Archive size={15} />
              {t("archivedChats", language)}
            </button>

            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
              className={menuItemClass}
            >
              <Github size={15} />
              {t("githubRepo", language)}
            </a>

            <button
              type="button"
              onClick={handleThemeToggle}
              role="menuitem"
              className={menuItemClass}
            >
              {isLightTheme ? <Moon size={15} /> : <Sun size={15} />}
              {isLightTheme ? t("darkMode", language) : t("lightMode", language)}
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              role="menuitem"
              className={signOutItemClass}
            >
              <LogOut size={15} />
              {isSigningOut ? `${t("signOut", language)}...` : t("signOut", language)}
            </button>
          </div>
        )}
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        language={language}
        errorMessage={errorMessage}
        isSaving={isSaving}
        nameInput={nameInput}
        emailInput={emailInput}
        avatarPreview={avatarPreview}
        settingsAvatarImgError={avatarLoadError}
        currentLanguageLabel={currentLanguageOption.label}
        isLanguageMenuOpen={isLanguageMenuOpen}
        settingsOverlayClass={settingsOverlayClass}
        settingsModalClass={settingsModalClass}
        settingsTitleClass={settingsTitleClass}
        settingsSubtitleClass={settingsSubtitleClass}
        closeButtonClass={closeButtonClass}
        avatarPlaceholderClass={avatarPlaceholderClass}
        secondaryActionButtonClass={secondaryActionButtonClass}
        removeActionButtonClass={removeActionButtonClass}
        inputLabelClass={inputLabelClass}
        inputClass={inputClass}
        selectInputClass={selectInputClass}
        cancelButtonClass={cancelButtonClass}
        fileInputRef={fileInputRef}
        languageMenuRef={languageMenuRef}
        languageMenuButtonRef={languageMenuButtonRef}
        onClose={() => setSettingsOpen(false)}
        onSubmit={handleSaveSettings}
        onAvatarFileChange={handleAvatarFileChange}
        onAvatarError={() => setAvatarLoadError(true)}
        onRemoveAvatar={handleRemoveAvatar}
        onNameInputChange={setNameInput}
        onEmailInputChange={setEmailInput}
        onToggleLanguageMenu={() => setIsLanguageMenuOpen((prev) => !prev)}
      />

      <DeploymentsModal
        isOpen={deploymentsOpen}
        language={language}
        isLoading={isDeploymentsLoading}
        deploymentsError={deploymentsError}
        deployments={deployments}
        editingWebsiteId={editingWebsiteId}
        editingWebsiteName={editingWebsiteName}
        renamingWebsiteId={renamingWebsiteId}
        settingsOverlayClass={settingsOverlayClass}
        deploymentsModalClass={deploymentsModalClass}
        settingsTitleClass={settingsTitleClass}
        settingsSubtitleClass={settingsSubtitleClass}
        closeButtonClass={closeButtonClass}
        onClose={() => setDeploymentsOpen(false)}
        onRefresh={() => void loadDeployments()}
        setEditingWebsiteName={setEditingWebsiteName}
        onSaveWebsiteName={(row) => void handleSaveWebsiteName(row)}
        onCancelRename={() => {
          setEditingWebsiteId(null);
          setEditingWebsiteName("");
        }}
        onStartRename={handleStartRename}
        formatDateTime={formatDateTime}
        getDeploymentStatusClass={getDeploymentStatusClass}
      />

      <ArchivedChatsModal
        isOpen={archivedChatsOpen}
        language={language}
        isLoading={isArchivedChatsLoading}
        archivedChatsError={archivedChatsError}
        restoringChatId={restoringChatId}
        archivedChats={archivedChats}
        settingsOverlayClass={settingsOverlayClass}
        settingsTitleClass={settingsTitleClass}
        settingsSubtitleClass={settingsSubtitleClass}
        closeButtonClass={closeButtonClass}
        onClose={() => setArchivedChatsOpen(false)}
        onRefresh={() => void loadArchivedChats()}
        onRestoreChat={(chatId) => void handleRestoreArchivedChat(chatId)}
        formatDateTime={formatDateTime}
      />

      {settingsOpen &&
        isLanguageMenuOpen &&
        createPortal(
          <div
            ref={languageMenuPanelRef}
            role="menu"
            style={{
              position: "fixed",
              top: `${languageMenuPosition.top}px`,
              left: `${languageMenuPosition.left}px`,
              width: `${languageMenuPosition.width}px`,
              maxHeight: `${languageMenuPosition.maxHeight}px`,
              WebkitOverflowScrolling: "touch",
            }}
            className="z-[200] overflow-y-auto overscroll-contain rounded-lg border border-[var(--app-input-border)] bg-[var(--app-panel)] p-1 shadow-[var(--app-shadow-lg)]"
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
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
                    setLanguage(option.code);
                    setIsLanguageMenuOpen(false);
                  }}
                  className={`flex w-full items-center rounded-md px-2.5 py-2 text-sm transition ${
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
          </div>,
          document.body
        )}
    </>
  );
}
