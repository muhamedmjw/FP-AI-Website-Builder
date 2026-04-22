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
import useThemeToggle from "@/client/lib/hooks/use-theme-toggle";
import { getSupabaseBrowserClient } from "@/client/lib/supabase-browser";
import { useLanguage } from "@/client/lib/language-context";
import SettingsModal from "@/client/features/sidebar/modals/settings-modal";
import DeploymentsModal from "@/client/features/sidebar/modals/deployments-modal";
import ArchivedChatsModal from "@/client/features/sidebar/modals/archived-chats-modal";
import SafetyPoliciesModal from "@/client/features/sidebar/modals/safety-policies-modal";
import useDeploymentsData from "@/client/features/sidebar/hooks/use-deployments-data";
import useArchivedChatsData from "@/client/features/sidebar/hooks/use-archived-chats-data";
import { ShieldAlert } from "lucide-react";
import { t } from "@/shared/constants/translations";
import { isMissingSessionError } from "@/shared/utils/auth-errors";
import { MAX_AVATAR_FILE_SIZE } from "@/shared/constants/limits";
import type { AppLanguage } from "@/shared/types/database";

const GITHUB_REPO_URL = "https://github.com/muhamedmjw/Final-Project";

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
  const { isLightTheme, toggleTheme } = useThemeToggle();
  const deploymentsData = useDeploymentsData(language);
  const archivedChatsData = useArchivedChatsData(language);

  const menuRef = useRef<HTMLDivElement>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const languageMenuButtonRef = useRef<HTMLButtonElement>(null);
  const languageMenuPanelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deploymentsOpen, setDeploymentsOpen] = useState(false);
  const [archivedChatsOpen, setArchivedChatsOpen] = useState(false);
  const [safetyPoliciesOpen, setSafetyPoliciesOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [languageMenuPosition, setLanguageMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 176,
  });
  // Pending language state - selected in dropdown but not applied until save
  const [pendingLanguage, setPendingLanguage] = useState<AppLanguage>(language);

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
        setSafetyPoliciesOpen(false);
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
    } else {
      // Reset pending language to current language when opening settings
      setPendingLanguage(language);
    }
  }, [settingsOpen, language]);

  useEffect(() => {
    if (!deploymentsOpen) {
      deploymentsData.cancelRename();
    }
  }, [deploymentsData, deploymentsOpen]);

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

      // Apply the pending language change when saving
      if (pendingLanguage !== language) {
        setLanguage(pendingLanguage);
      }

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

  function handleOpenDeployments() {
    setMenuOpen(false);
    setDeploymentsOpen(true);
    deploymentsData.setDeploymentsError("");
    void deploymentsData.loadDeployments();
  }

  function handleOpenArchivedChats() {
    setMenuOpen(false);
    setArchivedChatsOpen(true);
    archivedChatsData.setArchivedChatsError("");
    void archivedChatsData.loadArchivedChats();
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

  const accountLabel = userName?.trim() || userEmail?.trim() || t("account", language);
  const initials =
    accountLabel.length > 0 ? accountLabel.charAt(0).toUpperCase() : "A";

  const currentLanguageOption =
    LANGUAGE_OPTIONS.find((option) => option.code === pendingLanguage) ?? LANGUAGE_OPTIONS[0];

  const avatarFallbackClass =
    "flex h-9 w-9 items-center justify-center rounded-full bg-(--app-hover-bg-strong) text-sm font-semibold text-(--app-text-heading)";
  const menuPanelClass =
    "absolute right-0 top-full z-90 mt-2 w-56 overflow-hidden rounded-xl border border-(--app-card-border) bg-(--app-dropdown-bg) shadow-(--app-shadow-lg) md:bottom-full md:left-0 md:right-auto md:top-auto md:mb-2 md:mt-0 md:w-48";
  const menuItemClass =
    "cursor-pointer flex w-full items-center gap-2.5 whitespace-nowrap px-3.5 py-3 text-sm text-(--app-text-secondary) transition hover:bg-(--app-hover-bg) hover:text-(--app-text-heading)";
  const signOutItemClass =
    "cursor-pointer flex w-full items-center gap-2.5 px-3.5 py-3 text-sm text-rose-400 transition hover:bg-(--app-hover-bg) hover:text-rose-300";
  const settingsOverlayClass =
    "fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4";
  const settingsModalClass =
    "w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-(--app-card-border) bg-(--app-panel) shadow-(--app-shadow-lg) sm:max-w-xl sm:rounded-2xl";
  const deploymentsModalClass =
    "w-full max-h-[90vh] overflow-hidden rounded-t-2xl border border-(--app-card-border) bg-(--app-panel) shadow-(--app-shadow-lg) sm:max-w-6xl sm:rounded-2xl";
  const settingsTitleClass =
    "text-lg font-semibold text-(--app-text-heading)";
  const settingsSubtitleClass =
    "text-sm text-(--app-text-tertiary)";
  const closeButtonClass =
    "rounded-lg p-2 text-(--app-text-tertiary) transition hover:bg-(--app-hover-bg-strong) hover:text-(--app-text-heading)";
  const avatarPlaceholderClass =
    "flex h-16 w-16 items-center justify-center rounded-full border border-(--app-card-border) bg-(--app-input-bg) text-(--app-text-tertiary)";
  const secondaryActionButtonClass =
    "inline-flex items-center gap-2 rounded-lg bg-(--app-hover-bg) px-3 py-2 text-sm text-(--app-text-secondary) transition hover:bg-(--app-hover-bg-strong)";
  const removeActionButtonClass =
    "rounded-lg bg-(--app-hover-bg) px-3 py-2 text-sm text-(--app-text-tertiary) transition hover:bg-(--app-hover-bg-strong)";
  const inputLabelClass =
    "text-sm font-medium text-(--app-text-secondary)";
  const inputClass =
    "w-full rounded-lg border border-(--app-input-border) bg-(--app-input-bg) px-3.5 py-2.5 text-base text-(--app-input-text) focus:outline-none focus:border-(--app-input-focus-border)";
  const selectInputClass = `${inputClass} appearance-none pr-10`;
  const cancelButtonClass =
    "rounded-lg bg-(--app-hover-bg) px-4 py-2.5 text-sm text-(--app-text-secondary) transition hover:bg-(--app-hover-bg-strong)";

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
                className="h-9 w-9 rounded-full object-cover border border-(--app-card-border)"
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
              className="flex h-12 w-full items-center gap-3 rounded-xl bg-(--app-hover-bg) px-3 text-left transition hover:bg-(--app-hover-bg-strong) disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="h-8 w-8 rounded-full object-cover border border-(--app-card-border)"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-(--app-hover-bg-strong) text-sm font-semibold text-(--app-text-heading)">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-(--app-text-heading)">{accountLabel}</p>
                <p className="truncate text-xs text-(--app-text-tertiary)">{t("account", language)}</p>
              </div>
              <ChevronUp size={16} className={`text-(--app-text-tertiary) transition ${menuOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        )}

        {menuOpen && (
          <div
            role="menu"
            className={variant === "compact" ? menuPanelClass : "absolute bottom-full left-4 right-4 z-90 mb-2 overflow-hidden rounded-xl border border-(--app-card-border) bg-(--app-dropdown-bg) shadow-(--app-shadow-lg)"}
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

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setSafetyPoliciesOpen(true);
              }}
              role="menuitem"
              className={menuItemClass}
            >
              <ShieldAlert size={15} />
              {t("safetyPoliciesLabel", language)}
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
              onClick={toggleTheme}
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
        isLoading={deploymentsData.isDeploymentsLoading}
        deploymentsError={deploymentsData.deploymentsError}
        deployments={deploymentsData.deployments}
        editingWebsiteId={deploymentsData.editingWebsiteId}
        editingWebsiteName={deploymentsData.editingWebsiteName}
        renamingWebsiteId={deploymentsData.renamingWebsiteId}
        settingsOverlayClass={settingsOverlayClass}
        deploymentsModalClass={deploymentsModalClass}
        settingsTitleClass={settingsTitleClass}
        settingsSubtitleClass={settingsSubtitleClass}
        closeButtonClass={closeButtonClass}
        onClose={() => setDeploymentsOpen(false)}
        onRefresh={() => void deploymentsData.loadDeployments()}
        setEditingWebsiteName={deploymentsData.setEditingWebsiteName}
        onSaveWebsiteName={(row) => void deploymentsData.saveWebsiteName(row)}
        onCancelRename={deploymentsData.cancelRename}
        onStartRename={deploymentsData.startRename}
        formatDateTime={formatDateTime}
        getDeploymentStatusClass={getDeploymentStatusClass}
      />

      <ArchivedChatsModal
        isOpen={archivedChatsOpen}
        language={language}
        isLoading={archivedChatsData.isArchivedChatsLoading}
        archivedChatsError={archivedChatsData.archivedChatsError}
        restoringChatId={archivedChatsData.restoringChatId}
        archivedChats={archivedChatsData.archivedChats}
        settingsOverlayClass={settingsOverlayClass}
        settingsTitleClass={settingsTitleClass}
        settingsSubtitleClass={settingsSubtitleClass}
        closeButtonClass={closeButtonClass}
        onClose={() => setArchivedChatsOpen(false)}
        onRefresh={() => void archivedChatsData.loadArchivedChats()}
        onRestoreChat={(chatId) => void archivedChatsData.restoreArchivedChat(chatId)}
        formatDateTime={formatDateTime}
      />

      <SafetyPoliciesModal
        isOpen={safetyPoliciesOpen}
        onClose={() => setSafetyPoliciesOpen(false)}
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
            className="z-200 overflow-y-auto overscroll-contain rounded-lg border border-(--app-input-border) bg-(--app-panel) p-1 shadow-(--app-shadow-lg)"
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
          >
            {LANGUAGE_OPTIONS.map((option) => {
              const isActive = option.code === pendingLanguage;

              return (
                <button
                  key={option.code}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => {
                    setPendingLanguage(option.code);
                    setIsLanguageMenuOpen(false);
                  }}
                  className={`flex w-full items-center rounded-md px-2.5 py-2 text-sm transition ${
                    isActive
                      ? "bg-(--app-btn-primary-bg) text-(--app-btn-primary-text)"
                      : "text-(--app-text-secondary) hover:bg-(--app-hover-bg) hover:text-(--app-text-heading)"
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
