"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/client/lib/language-context";
import { useUserImages } from "@/client/lib/hooks/use-user-images";
import { t } from "@/shared/constants/translations";
import { MAX_PROMPT_LENGTH } from "@/shared/constants/limits";
import { getDisplayModelName, PRIMARY_MODEL } from "@/shared/constants/ai";
import type { UserImage } from "@/shared/types/database";

/**
 * Chat input bar — text input + send button at the bottom of the chat panel.
 */

const CHAT_INPUT_MAX_HEIGHT_PX = 140;

function PreviewDocumentIcon({
  active,
}: {
  active: boolean;
}) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      className={`transition-colors ${
        active
          ? "text-[var(--app-text-heading)]"
          : "text-[var(--app-text-secondary)]"
      }`}
      aria-hidden="true"
    >
      <path
        d="M3 2h8l4 4v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M11 2v4h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line x1="5" y1="9" x2="13" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5" y1="12" x2="13" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5" y1="15" x2="10" y2="15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

type ChatInputProps = {
  onSend: (message: string) => void;
  onTogglePreview?: () => void;
  onPreviewRequest?: () => void;
  showPreviewGateButton?: boolean;
  previewOpen?: boolean;
  hasPreview?: boolean;
  chatId?: string;
  onImagesChange?: (images: UserImage[]) => void;
  disabled?: boolean;
  placeholder?: string;
  isSticky?: boolean;
  autoFocus?: boolean;
  showDisclaimer?: boolean;
  pinDisclaimerToBottomOnMobile?: boolean;
};

export default function ChatInput({
  onSend,
  onTogglePreview,
  onPreviewRequest,
  showPreviewGateButton = false,
  previewOpen = false,
  hasPreview = false,
  chatId,
  onImagesChange,
  disabled = false,
  placeholder,
  isSticky = true,
  autoFocus = false,
  showDisclaimer = true,
  pinDisclaimerToBottomOnMobile = false,
}: ChatInputProps) {
  const { language } = useLanguage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [imageErrorMessage, setImageErrorMessage] = useState("");
  const {
    images,
    isLoading: isImageLoading,
    uploadImage,
    deleteImage,
    clearImages,
  } = useUserImages(chatId, { autoLoad: false });
  const resolvedPlaceholder = placeholder ?? t("inputPlaceholder", language);
  const displayModelName = getDisplayModelName(PRIMARY_MODEL);
  const disclaimerTemplate = t("aiDisclaimer", language);
  const disclaimerText = disclaimerTemplate.replace("{model}", displayModelName);
  const [disclaimerPrefix, disclaimerSuffix = ""] = disclaimerTemplate.split("{model}");
  const hasModelPlaceholder = disclaimerTemplate.includes("{model}");
  const charCount = inputValue.length;
  const shouldShowCounter = charCount > MAX_PROMPT_LENGTH * 0.8;
  const isAtPromptLimit = charCount >= MAX_PROMPT_LENGTH;
  const shouldShowPreviewToggle = typeof onTogglePreview === "function" && hasPreview;
  const shouldShowPreviewGateAction =
    showPreviewGateButton && typeof onPreviewRequest === "function";
  const isPreviewGateInteractive = hasPreview;
  const previewGateTooltip = hasPreview
    ? "Preview website"
    : "Generate a website first";
  const isGuestMode = !chatId;
  const visibleImages = images.slice(0, 6);
  const hiddenImagesCount = Math.max(0, images.length - visibleImages.length);
  const totalImageBytes = useMemo(
    () =>
      images.reduce((sum, image) => {
        const commaIndex = image.dataUri.indexOf(",");
        if (commaIndex < 0) {
          return sum;
        }

        const base64 = image.dataUri.slice(commaIndex + 1).replace(/\s+/g, "");
        if (!base64) {
          return sum;
        }

        const paddingLength = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
        const bytes = Math.max(0, Math.floor((base64.length * 3) / 4) - paddingLength);
        return sum + bytes;
      }, 0),
    [images]
  );
  const hasLargeImagePayload = totalImageBytes > 2 * 1024 * 1024;

  useEffect(() => {
    if (onImagesChange) {
      onImagesChange(images);
    }
  }, [images, onImagesChange]);

  const adjustHeight = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    const clampedHeight = Math.min(el.scrollHeight, CHAT_INPUT_MAX_HEIGHT_PX);
    el.style.height = `${clampedHeight}px`;
    el.style.overflowY =
      el.scrollHeight > CHAT_INPUT_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, []);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight(textareaRef.current);
    }
  }, [adjustHeight]);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight(textareaRef.current);
    }
  }, [adjustHeight, inputValue]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = inputValue.trim();
    if (!message) return;

    onSend(message);
    clearImages();
    setInputValue("");
    setTimeout(() => {
      if (textareaRef.current) {
        adjustHeight(textareaRef.current);
      }
    }, 0);
  }

  function handleOpenImagePicker() {
    if (isGuestMode) {
      setImageErrorMessage(t("signInToUploadImages", language));
      return;
    }

    fileInputRef.current?.click();
  }

  async function handleImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setImageErrorMessage("Only image files are supported.");
      return;
    }

    setImageErrorMessage("");

    try {
      await uploadImage(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload image.";
      setImageErrorMessage(message);
    }
  }

  async function handleRemoveImage(fileId: string) {
    setImageErrorMessage("");

    try {
      await deleteImage(fileId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove image.";
      setImageErrorMessage(message);
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelected}
        className="hidden"
        aria-hidden="true"
      />
      <form
        onSubmit={handleSubmit}
        className={`${isSticky ? "sticky bottom-0 z-10" : ""} bg-transparent px-3 pt-3 pb-4 sm:px-5 sm:pt-4 sm:pb-3`}
      >
        <div className="mx-auto flex w-full max-w-4xl items-end gap-2">
          <div className={`flex min-w-0 flex-1 flex-col gap-1 rounded-2xl bg-[var(--app-card-bg)]/80 p-1.5 shadow-[var(--app-shadow-lg)] backdrop-blur-sm transition-opacity sm:p-2 ${disabled ? "opacity-70" : "opacity-100"}`}>
            <div className="flex min-w-0 flex-1 flex-col">
              {images.length > 0 ? (
                <div className="px-2.5 pb-1.5 pt-1 sm:px-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {visibleImages.map((image, index) => (
                      <div key={image.fileId} className="w-12">
                        <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-[var(--app-card-border)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.dataUri}
                            alt={image.fileName}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              void handleRemoveImage(image.fileId);
                            }}
                            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--app-card-border)] bg-[var(--app-panel)] text-[var(--app-text-secondary)] transition hover:text-[var(--app-text-heading)]"
                            aria-label="Remove image"
                            title="Remove image"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <p className="mt-1 truncate text-center text-[10px] text-[var(--app-text-tertiary)]">
                          {t("imageLabel", language)} {index + 1}
                        </p>
                      </div>
                    ))}
                    {hiddenImagesCount > 0 ? (
                      <span className="rounded-full border border-[var(--app-card-border)] px-2 py-1 text-[10px] font-medium text-[var(--app-text-secondary)]">
                        +{hiddenImagesCount} more
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputValue}
                onChange={(event) => {
                  setInputValue(event.target.value);
                  adjustHeight(event.currentTarget);
                }}
                onKeyDown={handleKeyDown}
                maxLength={MAX_PROMPT_LENGTH}
                placeholder={resolvedPlaceholder}
                disabled={disabled}
                aria-busy={disabled}
                autoFocus={autoFocus}
                className="w-full resize-none overflow-hidden rounded-xl bg-transparent px-2.5 py-2.5 text-sm leading-relaxed text-[var(--app-input-text)] placeholder:text-[var(--app-text-tertiary)] focus:outline-none disabled:opacity-50 sm:px-3 sm:py-3 sm:text-base"
                style={{
                  height: "auto",
                  maxHeight: `${CHAT_INPUT_MAX_HEIGHT_PX}px`,
                  overflowY: "hidden",
                }}
              />
              {shouldShowCounter ? (
                <p
                  className={`px-2.5 pb-0.5 text-right text-[10px] sm:px-3 ${
                    isAtPromptLimit ? "text-rose-400" : "text-[var(--app-text-muted)]"
                  }`}
                  aria-live="polite"
                >
                  {charCount}/{MAX_PROMPT_LENGTH}
                </p>
              ) : null}
              {hasLargeImagePayload ? (
                <p className="px-2.5 pb-0.5 text-[10px] text-amber-400 sm:px-3" role="status">
                  Uploaded image data is over 2 MB and may reduce generation quality.
                </p>
              ) : null}
              {imageErrorMessage ? (
                <p className="px-2.5 pb-0.5 text-[10px] text-rose-400 sm:px-3" role="alert">
                  {imageErrorMessage}
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-between px-1 pb-1">
              {!isGuestMode ? (
                <button
                  type="button"
                  onClick={handleOpenImagePicker}
                  disabled={disabled || isImageLoading}
                  className="flex h-10 w-10 shrink-0 items-center justify-center text-2xl leading-none text-[var(--app-text-secondary)] transition hover:text-[var(--app-text-heading)] disabled:opacity-50 sm:h-11 sm:w-11"
                  title="Upload image"
                  aria-label="Upload image"
                >
                  <span aria-hidden="true">+</span>
                </button>
              ) : (
                <span
                  className="rounded-lg border border-[var(--app-card-border)] px-2 py-1 text-[10px] text-[var(--app-text-tertiary)]"
                  title={t("signInToUploadImages", language)}
                >
                  {t("signInToUploadImages", language)}
                </span>
              )}

              <div className="flex items-center gap-1.5">
                {shouldShowPreviewToggle ? (
                  <button
                    type="button"
                    onClick={onTogglePreview}
                    className={`relative hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-150 md:flex sm:h-11 sm:w-11 ${
                      previewOpen
                        ? "bg-[var(--app-hover-bg-strong)] border-[var(--app-text-tertiary)]"
                        : "bg-[var(--app-card-bg)] border-[var(--app-card-border)]"
                    } hover:bg-[var(--app-hover-bg-strong)] hover:border-[var(--app-text-muted)]`}
                    title={previewOpen ? "Hide preview" : "Show preview"}
                    aria-label={previewOpen ? "Hide preview" : "Show preview"}
                  >
                    {previewOpen ? (
                      <span
                        className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_0_1px_rgba(56,189,248,0.35),0_0_10px_rgba(56,189,248,0.55)]"
                        aria-hidden="true"
                      />
                    ) : null}
                    <PreviewDocumentIcon active={previewOpen} />
                  </button>
                ) : null}

                {shouldShowPreviewGateAction ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (hasPreview) {
                        onPreviewRequest();
                      }
                    }}
                    disabled={!hasPreview}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--app-card-border)] bg-[var(--app-card-bg)] text-[var(--app-text-secondary)] transition disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:w-11 ${
                      isPreviewGateInteractive
                        ? "cursor-pointer hover:bg-[var(--app-hover-bg-strong)] hover:text-[var(--app-text-heading)]"
                        : "cursor-not-allowed"
                    }`}
                    title={previewGateTooltip}
                    aria-label={previewGateTooltip}
                  >
                    <PreviewDocumentIcon active={hasPreview} />
                  </button>
                ) : null}

                <button
                  type="submit"
                  disabled={disabled}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-btn-primary-bg)] text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:bg-[var(--app-btn-primary-hover)] hover:shadow-[var(--app-shadow-md)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 sm:h-11 sm:w-11"
                  title="Send"
                  aria-label="Send message"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 19V6" />
                    <path d="M6.5 11.5L12 6l5.5 5.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {showDisclaimer ? (
        <p
          className={`mx-auto w-full max-w-full whitespace-normal text-center text-xs wrap-break-word ${
            pinDisclaimerToBottomOnMobile
              ? "fixed inset-x-0 bottom-1 z-20 px-4 text-(--app-text-muted) md:relative md:top-px md:bottom-auto md:z-auto md:px-5 md:pb-2 md:pt-0.5"
              : "relative top-px px-4 pb-2 pt-0.5 text-(--app-text-muted) sm:px-5"
          }`}
        >
          {hasModelPlaceholder ? (
            <>
              {disclaimerPrefix}
              <span className="font-medium text-[var(--app-text-tertiary)]">{displayModelName}</span>
              {disclaimerSuffix}
            </>
          ) : (
            disclaimerText
          )}
        </p>
      ) : null}
    </>
  );
}
