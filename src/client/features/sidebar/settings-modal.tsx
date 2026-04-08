"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, RefObject } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Upload, UserCircle2, X } from "lucide-react";
import { t } from "@/shared/constants/translations";
import type { AppLanguage } from "@/shared/types/database";

type SettingsModalProps = {
  isOpen: boolean;
  language: AppLanguage;
  errorMessage: string;
  isSaving: boolean;
  nameInput: string;
  emailInput: string;
  avatarPreview: string | null;
  settingsAvatarImgError: boolean;
  currentLanguageLabel: string;
  isLanguageMenuOpen: boolean;
  settingsOverlayClass: string;
  settingsModalClass: string;
  settingsTitleClass: string;
  settingsSubtitleClass: string;
  closeButtonClass: string;
  avatarPlaceholderClass: string;
  secondaryActionButtonClass: string;
  removeActionButtonClass: string;
  inputLabelClass: string;
  inputClass: string;
  selectInputClass: string;
  cancelButtonClass: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  languageMenuRef: RefObject<HTMLDivElement | null>;
  languageMenuButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAvatarError: () => void;
  onRemoveAvatar: () => void;
  onNameInputChange: (value: string) => void;
  onEmailInputChange: (value: string) => void;
  onToggleLanguageMenu: () => void;
};

export default function SettingsModal({
  isOpen,
  language,
  errorMessage,
  isSaving,
  nameInput,
  emailInput,
  avatarPreview,
  settingsAvatarImgError,
  currentLanguageLabel,
  isLanguageMenuOpen,
  settingsOverlayClass,
  settingsModalClass,
  settingsTitleClass,
  settingsSubtitleClass,
  closeButtonClass,
  avatarPlaceholderClass,
  secondaryActionButtonClass,
  removeActionButtonClass,
  inputLabelClass,
  inputClass,
  selectInputClass,
  cancelButtonClass,
  fileInputRef,
  languageMenuRef,
  languageMenuButtonRef,
  onClose,
  onSubmit,
  onAvatarFileChange,
  onAvatarError,
  onRemoveAvatar,
  onNameInputChange,
  onEmailInputChange,
  onToggleLanguageMenu,
}: SettingsModalProps) {
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
      <div className={settingsModalClass}>
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h3 className={settingsTitleClass}>{t("settingsTitle", language)}</h3>
            <p className={settingsSubtitleClass}>{t("settingsSubtitle", language)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={closeButtonClass}
            title={t("close", language)}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 px-6 py-5">
          <div className="flex items-center gap-4">
            {avatarPreview && !settingsAvatarImgError ? (
              <img
                src={avatarPreview}
                alt="Profile preview"
                loading="lazy"
                onError={onAvatarError}
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
                onClick={onRemoveAvatar}
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
            onChange={onAvatarFileChange}
            className="hidden"
          />

          <label className="block space-y-2">
            <span className={inputLabelClass}>{t("name", language)}</span>
            <input
              type="text"
              value={nameInput}
              onChange={(event) => onNameInputChange(event.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block space-y-2">
            <span className={inputLabelClass}>{t("email", language)}</span>
            <input
              type="email"
              value={emailInput}
              onChange={(event) => onEmailInputChange(event.target.value)}
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
                onClick={onToggleLanguageMenu}
              >
                <span className="font-semibold">{currentLanguageLabel}</span>
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

          {errorMessage ? <p className="text-sm text-rose-400">{errorMessage}</p> : null}

          <div className="flex justify-end gap-2.5 pt-1">
            <button type="button" onClick={onClose} className={cancelButtonClass}>
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
  );
}
