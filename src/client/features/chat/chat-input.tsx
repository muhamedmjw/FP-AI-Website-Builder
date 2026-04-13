"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { useLanguage } from "@/client/lib/language-context";
import { useUserImages } from "@/client/lib/hooks/use-user-images";
import { t } from "@/shared/constants/translations";
import { MAX_PROMPT_LENGTH, MAX_ATTACHMENTS_PER_MESSAGE } from "@/shared/constants/limits";
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
  onStop?: () => void;
  showPreviewGateButton?: boolean;
  previewOpen?: boolean;
  hasPreview?: boolean;
  chatId?: string;
  onImagesChange?: (images: UserImage[]) => void;
  disableTyping?: boolean;
  disableSend?: boolean;
  isGenerating?: boolean;
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
  onStop,
  showPreviewGateButton = false,
  previewOpen = false,
  hasPreview = false,
  chatId,
  onImagesChange,
  disableTyping = false,
  disableSend = false,
  isGenerating = false,
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
  const isInputDisabled = disableTyping;
  const isSendDisabled = disableSend || isInputDisabled || isImageLoading;
  const attachmentsFull = images.length >= MAX_ATTACHMENTS_PER_MESSAGE;

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

      if (isSendDisabled) {
        return;
      }

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

    if (isSendDisabled) {
      return;
    }

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

    if (attachmentsFull) {
      setImageErrorMessage(`Maximum ${MAX_ATTACHMENTS_PER_MESSAGE} images allowed per message.`);
      return;
    }

    fileInputRef.current?.click();
  }

  async function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    setImageErrorMessage("");

    const remainingSlots = MAX_ATTACHMENTS_PER_MESSAGE - images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      setImageErrorMessage(
        `Only ${remainingSlots} more image(s) can be added. ${files.length - remainingSlots} file(s) were skipped.`
      );
    }

    for (const file of filesToProcess) {
      if (!file.type.startsWith("image/")) {
        setImageErrorMessage("Only image files are supported. Some files were skipped.");
        continue;
      }

      try {
        await uploadImage(file);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to upload image.";
        setImageErrorMessage(message);
      }
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
        multiple
        onChange={handleFilesSelected}
        className="hidden"
        aria-hidden="true"
      />
      <form
        onSubmit={handleSubmit}
        className={`${isSticky ? "sticky bottom-0 z-10" : ""} bg-transparent px-3 pt-3 pb-4 sm:px-5 sm:pt-4 sm:pb-3`}
      >
        <div className="mx-auto flex w-full max-w-4xl items-end gap-2">
          <div className={`flex min-w-0 flex-1 flex-col gap-1 rounded-2xl bg-[var(--app-card-bg)]/80 p-1.5 shadow-[var(--app-shadow-lg)] backdrop-blur-sm transition-opacity sm:p-2 ${isInputDisabled ? "opacity-70" : "opacity-100"}`}>
            <div className="flex min-w-0 flex-1 flex-col">
              {images.length > 0 ? (
                <div className="px-2.5 pb-1.5 pt-2 sm:px-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {images.map((image, index) => (
                      <div key={image.fileId} className="relative group/thumb">
                        <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-[var(--app-card-border)] shadow-sm transition-transform hover:scale-105 sm:h-16 sm:w-16">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.dataUri}
                            alt={image.fileName}
                            className="h-full w-full object-cover"
                          />
                          {/* Tag badge overlay */}
                          <span className="absolute bottom-0 inset-x-0 bg-black/60 py-0.5 text-center text-[9px] font-semibold text-white/90 backdrop-blur-sm">
                            {t("imageLabel", language)} {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              void handleRemoveImage(image.fileId);
                            }}
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--app-card-border)] bg-[var(--app-panel)] text-[var(--app-text-secondary)] opacity-0 transition-all group-hover/thumb:opacity-100 hover:text-rose-400 hover:border-rose-400/50"
                            aria-label="Remove image"
                            title="Remove image"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {!attachmentsFull ? (
                      <button
                        type="button"
                        onClick={handleOpenImagePicker}
                        disabled={isInputDisabled || isImageLoading}
                        className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-[var(--app-card-border)] text-[var(--app-text-tertiary)] transition-colors hover:border-[var(--app-text-secondary)] hover:text-[var(--app-text-secondary)] disabled:opacity-40 sm:h-16 sm:w-16"
                        title="Add more images"
                        aria-label="Add more images"
                      >
                        <ImagePlus size={18} />
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-[10px] text-[var(--app-text-muted)]">
                    {images.length}/{MAX_ATTACHMENTS_PER_MESSAGE} images attached
                  </p>
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
                disabled={isInputDisabled}
                aria-busy={isSendDisabled}
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
                  disabled={isInputDisabled || isImageLoading || attachmentsFull}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-hover-bg-strong)] hover:text-[var(--app-text-heading)] disabled:opacity-40 sm:h-11 sm:w-11"
                  title={attachmentsFull ? `Max ${MAX_ATTACHMENTS_PER_MESSAGE} images` : "Attach images"}
                  aria-label={attachmentsFull ? `Max ${MAX_ATTACHMENTS_PER_MESSAGE} images` : "Attach images"}
                >
                  <ImagePlus size={18} />
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

                {isGenerating && onStop ? (
                  <button
                    type="button"
                    onClick={onStop}
                    className="stop-btn-glow group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.35)] transition-all duration-200 hover:from-rose-400 hover:to-red-500 hover:shadow-[0_0_20px_rgba(244,63,94,0.5)] hover:-translate-y-px active:translate-y-0 active:shadow-[0_0_8px_rgba(244,63,94,0.3)] sm:h-11 sm:w-11"
                    title="Stop generation"
                    aria-label="Stop generation"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="currentColor"
                      aria-hidden="true"
                      className="transition-transform duration-150 group-hover:scale-110"
                    >
                      <rect x="6" y="6" width="12" height="12" rx="3" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSendDisabled}
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
                )}
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
