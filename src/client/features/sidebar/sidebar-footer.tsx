"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
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
import { isMissingSessionError } from "@/shared/utils/auth-errors";
import { MAX_AVATAR_FILE_SIZE } from "@/shared/constants/limits";

const GITHUB_REPO_URL = "https://github.com/muhamedmjw/Final-Project";
const THEME_STORAGE_KEY = "app-theme";

type Theme = "dark" | "light";

type SidebarFooterProps = {
  userName: string | null;
  userEmail: string | null;
  userAvatarUrl: string | null;
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
  onProfileUpdated,
}: SidebarFooterProps) {
  const router = useRouter();

  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [theme, setTheme] = useState<Theme>("dark");

  const [nameInput, setNameInput] = useState(userName ?? "");
  const [emailInput, setEmailInput] = useState(userEmail ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    userAvatarUrl
  );

  useEffect(() => {
    setNameInput(userName ?? "");
    setEmailInput(userEmail ?? "");
    setAvatarPreview(userAvatarUrl);
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
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSettingsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

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
      setErrorMessage("Image must be smaller than 2MB.");
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setAvatarPreview(dataUrl);
      setErrorMessage("");
    } catch (error) {
      console.error("Failed to read avatar file:", error);
      setErrorMessage("Could not use that image. Try another one.");
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
      setErrorMessage("Name is required.");
      return;
    }

    if (!nextEmail) {
      setErrorMessage("Email is required.");
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
        throw new Error("Your session expired. Please sign in again.");
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
        .update({ name: nextName, email: nextEmail, avatar_url: avatarPreview })
        .eq("id", user.id);

      if (profileError) throw profileError;

      onProfileUpdated({
        name: nextName,
        email: nextEmail,
        avatarUrl: avatarPreview,
      });

      setSettingsOpen(false);
      setMenuOpen(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save changes."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const accountLabel = userName?.trim() || userEmail?.trim() || "Account";
  const initials =
    accountLabel.length > 0 ? accountLabel.charAt(0).toUpperCase() : "A";
  const isLightTheme = theme === "light";

  function handleThemeToggle() {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  const accountButtonClass =
    "flex h-12 w-full items-center gap-3 rounded-xl bg-[var(--app-hover-bg)] px-3 text-left transition hover:bg-[var(--app-hover-bg-strong)] disabled:cursor-not-allowed disabled:opacity-50";
  const avatarFallbackClass =
    "flex h-8 w-8 items-center justify-center rounded-full bg-[var(--app-hover-bg-strong)] text-sm font-semibold text-[var(--app-text-heading)]";
  const accountNameClass =
    "truncate text-sm font-semibold text-[var(--app-text-heading)]";
  const accountMetaClass =
    "truncate text-xs text-[var(--app-text-tertiary)]";
  const chevronClass =
    `text-[var(--app-text-tertiary)] transition ${menuOpen ? "rotate-180" : ""}`;
  const menuPanelClass =
    "absolute bottom-full left-4 right-4 z-30 mb-2 overflow-hidden rounded-xl border border-[var(--app-card-border)] bg-[var(--app-dropdown-bg)] shadow-[var(--app-shadow-lg)]";
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
  const cancelButtonClass =
    "rounded-lg bg-[var(--app-hover-bg)] px-4 py-2.5 text-sm text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg-strong)]";

  return (
    <>
      <div className="relative px-4 py-4" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          disabled={isSigningOut}
          className={accountButtonClass}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          title="Account"
        >
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Account avatar"
              className="h-8 w-8 rounded-full object-cover border border-[var(--app-card-border)]"
            />
          ) : (
            <div className={avatarFallbackClass}>
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className={accountNameClass}>
              {accountLabel}
            </p>
            <p className={accountMetaClass}>Account</p>
          </div>

          <ChevronUp
            size={16}
            className={chevronClass}
          />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className={menuPanelClass}
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
              Settings
            </button>

            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
              className={menuItemClass}
            >
              <Github size={15} />
              GitHub Repo
            </a>

            <button
              type="button"
              onClick={handleThemeToggle}
              role="menuitem"
              className={menuItemClass}
            >
              {isLightTheme ? <Moon size={15} /> : <Sun size={15} />}
              {isLightTheme ? "Dark Mode" : "Light Mode"}
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              role="menuitem"
              className={signOutItemClass}
            >
              <LogOut size={15} />
              {isSigningOut ? "Signing out..." : "Log out"}
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
                <h3 className={settingsTitleClass}>Settings</h3>
                <p className={settingsSubtitleClass}>
                  Update your account picture, name, and email.
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
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile preview"
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
                    Upload Picture
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className={removeActionButtonClass}
                  >
                    Remove
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
                <span className={inputLabelClass}>Name</span>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="block space-y-2">
                <span className={inputLabelClass}>Email</span>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(event) => setEmailInput(event.target.value)}
                  className={inputClass}
                />
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-[var(--app-btn-primary-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:bg-[var(--app-btn-primary-hover)] hover:shadow-[var(--app-shadow-md)] hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
