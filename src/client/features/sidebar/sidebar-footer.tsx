"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronUp,
  Github,
  LogOut,
  Moon,
  Settings,
  Sun,
  Upload,
  UserCircle2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/client/lib/supabase-browser";
import { useLanguage } from "@/client/lib/language-context";
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
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [theme, setTheme] = useState<Theme>("dark");
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [languageMenuPosition, setLanguageMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const [nameInput, setNameInput] = useState(userName ?? "");
  const [emailInput, setEmailInput] = useState(userEmail ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    userAvatarUrl
  );
  const [compactAvatarImgError, setCompactAvatarImgError] = useState(false);
  const [fullAvatarImgError, setFullAvatarImgError] = useState(false);
  const [settingsAvatarImgError, setSettingsAvatarImgError] = useState(false);

  useEffect(() => {
    setNameInput(userName ?? "");
    setEmailInput(userEmail ?? "");
    setAvatarPreview(userAvatarUrl);
    setCompactAvatarImgError(false);
    setFullAvatarImgError(false);
    setSettingsAvatarImgError(false);
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
    if (!isLanguageMenuOpen) return;

    const updateLanguageMenuPosition = () => {
      const trigger = languageMenuButtonRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      setLanguageMenuPosition({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
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
    "absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-[var(--app-card-border)] bg-[var(--app-dropdown-bg)] shadow-[var(--app-shadow-lg)] md:bottom-full md:left-0 md:right-auto md:top-auto md:mb-2 md:mt-0";
  const menuItemClass =
    "cursor-pointer flex w-full items-center gap-2.5 px-3.5 py-3 text-sm text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)]";
  const signOutItemClass =
    "cursor-pointer flex w-full items-center gap-2.5 px-3.5 py-3 text-sm text-rose-400 transition hover:bg-[var(--app-hover-bg)] hover:text-rose-300";
  const settingsOverlayClass =
    "fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4";
  const settingsModalClass =
    "w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-[var(--app-card-border)] bg-[var(--app-panel)] shadow-[var(--app-shadow-lg)] sm:max-w-xl sm:rounded-2xl";
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
            {avatarPreview && !compactAvatarImgError ? (
              <img
                src={avatarPreview}
                alt="Account avatar"
                loading="lazy"
                onError={() => setCompactAvatarImgError(true)}
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
              {avatarPreview && !fullAvatarImgError ? (
                <img
                  src={avatarPreview}
                  alt="Account avatar"
                  loading="lazy"
                  onError={() => setFullAvatarImgError(true)}
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
            className={variant === "compact" ? menuPanelClass : "absolute bottom-full left-4 right-4 z-50 mb-2 overflow-hidden rounded-xl border border-[var(--app-card-border)] bg-[var(--app-dropdown-bg)] shadow-[var(--app-shadow-lg)]"}
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

      {settingsOpen && createPortal(
        <div
          className={settingsOverlayClass}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSettingsOpen(false);
            }
          }}
        >
          <div className={settingsModalClass}>
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h3 className={settingsTitleClass}>{t("settingsTitle", language)}</h3>
                <p className={settingsSubtitleClass}>
                  {t("settingsSubtitle", language)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className={closeButtonClass}
                title="Close settings"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5 px-6 py-5">
              <div className="flex items-center gap-4">
                {avatarPreview && !settingsAvatarImgError ? (
                  <img
                    src={avatarPreview}
                    alt="Profile preview"
                    loading="lazy"
                    onError={() => setSettingsAvatarImgError(true)}
                    className="h-16 w-16 rounded-full object-cover border border-[var(--app-card-border)]"
                  />
                ) : (
                  <div className={avatarPlaceholderClass}>
                    <UserCircle2 size={30} />
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={secondaryActionButtonClass}
                  >
                    <Upload size={14} />
                    {t("uploadPicture", language)}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className={removeActionButtonClass}
                  >
                    {t("removePicture", language)}
                  </button>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="hidden"
              />

              <label className="block space-y-2">
                <span className={inputLabelClass}>{t("name", language)}</span>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="block space-y-2">
                <span className={inputLabelClass}>{t("email", language)}</span>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(event) => setEmailInput(event.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="block space-y-2">
                <span className={inputLabelClass}>{t("language", language)}</span>
                <div ref={languageMenuRef} className="relative">
                  <button
                    ref={languageMenuButtonRef}
                    type="button"
                    className={`${selectInputClass} flex items-center justify-between text-left`}
                    aria-haspopup="menu"
                    aria-expanded={isLanguageMenuOpen}
                    onClick={() => setIsLanguageMenuOpen((prev) => !prev)}
                  >
                    <span className={currentLanguageOption.code === "en" ? "font-medium" : "font-semibold"}>
                      {currentLanguageOption.label}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-[var(--app-text-tertiary)] transition ${
                        isLanguageMenuOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </label>

              {errorMessage ? (
                <p className="text-sm text-rose-400">{errorMessage}</p>
              ) : null}

              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className={cancelButtonClass}
                >
                  {t("cancel", language)}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-[var(--app-btn-primary-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:bg-[var(--app-btn-primary-hover)] hover:shadow-[var(--app-shadow-md)] hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? `${t("saveChanges", language)}...` : t("saveChanges", language)}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

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
            }}
            className="z-[70] max-h-44 overflow-y-auto overscroll-contain rounded-lg border border-[var(--app-input-border)] bg-[var(--app-panel)] p-1 shadow-[var(--app-shadow-lg)]"
            onWheel={(event) => event.stopPropagation()}
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
