"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronUp,
  Github,
  LogOut,
  Settings,
  Upload,
  UserCircle2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

const GITHUB_REPO_URL = "https://github.com/muhamedmjw/Final-Project";
const MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024;

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

      if (error) throw error;

      router.push("/");
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

  return (
    <>
      <div className="relative px-4 py-4" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          disabled={isSigningOut}
          className="flex h-12 w-full items-center gap-3 rounded-xl bg-white/[0.05] px-3 text-left transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          title="Account"
        >
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Account avatar"
              className="h-8 w-8 rounded-full border border-white/10 object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-sm font-semibold text-neutral-300">
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-neutral-100">
              {accountLabel}
            </p>
            <p className="truncate text-xs text-neutral-500">Account</p>
          </div>

          <ChevronUp
            size={16}
            className={`text-neutral-500 transition ${menuOpen ? "rotate-180" : ""}`}
          />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute bottom-full left-4 right-4 z-30 mb-2 overflow-hidden rounded-xl border border-white/[0.06] bg-[#181818] shadow-[0_12px_28px_rgba(0,0,0,0.5)]"
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setErrorMessage("");
                setSettingsOpen(true);
              }}
              role="menuitem"
              className="cursor-pointer flex w-full items-center gap-2.5 px-3.5 py-3 text-sm text-neutral-300 transition hover:bg-white/[0.1] hover:text-white"
            >
              <Settings size={15} />
              Settings
            </button>

            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
              className="cursor-pointer flex w-full items-center gap-2.5 px-3.5 py-3 text-sm text-neutral-300 transition hover:bg-white/[0.1] hover:text-white"
            >
              <Github size={15} />
              GitHub Repo
            </a>

            <button
              type="button"
              onClick={handleSignOut}
              role="menuitem"
              className="cursor-pointer flex w-full items-center gap-2.5 px-3.5 py-3 text-sm text-rose-300 transition hover:bg-white/[0.1] hover:text-rose-200"
            >
              <LogOut size={15} />
              {isSigningOut ? "Signing out..." : "Log out"}
            </button>
          </div>
        )}
      </div>

      {settingsOpen && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSettingsOpen(false);
            }
          }}
        >
          <div className="w-full max-w-xl rounded-2xl bg-[#151515] shadow-[0_24px_48px_rgba(0,0,0,0.65)]">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-neutral-100">Settings</h3>
                <p className="text-sm text-neutral-500">
                  Update your account picture, name, and email.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg p-2 text-neutral-500 transition hover:bg-white/10 hover:text-neutral-200"
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
                    className="h-16 w-16 rounded-full border border-white/[0.08] object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/[0.08] bg-[#1a1a1a] text-neutral-500">
                    <UserCircle2 size={30} />
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-neutral-300 transition hover:bg-white/10"
                  >
                    <Upload size={14} />
                    Upload Picture
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-neutral-400 transition hover:bg-white/10"
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
                <span className="text-sm font-medium text-neutral-400">Name</span>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  className="w-full rounded-lg bg-[#0e0e0e] px-3.5 py-2.5 text-base text-neutral-100 focus:outline-none"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-neutral-400">Email</span>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(event) => setEmailInput(event.target.value)}
                  className="w-full rounded-lg bg-[#0e0e0e] px-3.5 py-2.5 text-base text-neutral-100 focus:outline-none"
                />
              </label>

              {errorMessage ? (
                <p className="text-sm text-rose-400">{errorMessage}</p>
              ) : null}

              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="rounded-lg bg-white/[0.04] px-4 py-2.5 text-sm text-neutral-400 transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rainbow-hover rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
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
