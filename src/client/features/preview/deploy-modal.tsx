"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  Check,
  Copy,
  Globe,
  RefreshCw,
  Rocket,
} from "lucide-react";
import { useLanguage } from "@/client/lib/language-context";
import { useElapsedSeconds } from "@/client/lib/hooks/use-elapsed-seconds";
import { t } from "@/shared/constants/translations";

type DeployModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (siteName?: string) => void;
  isDeploying: boolean;
  deployUrl: string | null;
  deployError: string;
  hasDeployed: boolean;
  canRedeploy: boolean;
};

export default function DeployModal({
  isOpen,
  onClose,
  onConfirm,
  isDeploying,
  deployUrl,
  deployError,
  hasDeployed,
  canRedeploy,
}: DeployModalProps) {
  const { language } = useLanguage();
  const elapsedSeconds = useElapsedSeconds(isOpen && isDeploying);
  const [copied, setCopied] = useState(false);
  const [hasConfirmedThisOpen, setHasConfirmedThisOpen] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [siteNameError, setSiteNameError] = useState("");
  const [isRandomNameConfirmOpen, setIsRandomNameConfirmOpen] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timeoutId = window.setTimeout(() => {
      setCopied(false);
    }, 1500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copied]);

  const progressWidth = Math.min(90, (elapsedSeconds / 30) * 90);

  const loadingStatus = useMemo(() => {
    if (elapsedSeconds < 5) return t("connectingNetlify", language);
    if (elapsedSeconds < 12) return t("uploadingWebsite", language);
    if (elapsedSeconds < 20) return t("buildingSite", language);
    if (elapsedSeconds < 28) return t("almostReady", language);
    return t("stillDeploying", language);
  }, [elapsedSeconds, language]);

  const hasDeployError = Boolean(deployError);
  const showLoading = isOpen && isDeploying;
  const showRedeployConfirmation =
    isOpen &&
    !isDeploying &&
    !hasDeployError &&
    hasDeployed &&
    canRedeploy &&
    !hasConfirmedThisOpen;
  const showRandomNameConfirmation =
    isOpen &&
    !isDeploying &&
    !hasDeployError &&
    !deployUrl &&
    !hasDeployed &&
    isRandomNameConfirmOpen;
  const showConfirmation =
    isOpen &&
    !isDeploying &&
    !hasDeployError &&
    !deployUrl &&
    !hasDeployed &&
    !isRandomNameConfirmOpen;
  const showError = isOpen && !isDeploying && hasDeployError;
  const showSuccess =
    isOpen &&
    !isDeploying &&
    Boolean(deployUrl) &&
    !hasDeployError &&
    !showRedeployConfirmation;

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  async function handleCopy() {
    if (!deployUrl) return;

    try {
      await navigator.clipboard.writeText(deployUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function getSiteNameForSubmit() {
    const normalized = siteName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    if (!normalized) {
      setSiteNameError("");
      return { ok: true as const, value: undefined };
    }

    if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/.test(normalized)) {
      setSiteNameError(t("customSiteNameInvalid", language));
      return { ok: false as const, value: undefined };
    }

    setSiteNameError("");
    return { ok: true as const, value: normalized };
  }

  function handleConfirm() {
    if (!hasDeployed) {
      const nextSiteName = getSiteNameForSubmit();
      if (!nextSiteName.ok) {
        return;
      }

      if (!nextSiteName.value && !isRandomNameConfirmOpen) {
        setIsRandomNameConfirmOpen(true);
        return;
      }

      setHasConfirmedThisOpen(true);
      onConfirm(nextSiteName.value);
      return;
    }

    setHasConfirmedThisOpen(true);
    onConfirm();
  }

  function handleClose() {
    setCopied(false);
    setHasConfirmedThisOpen(false);
    setSiteName("");
    setSiteNameError("");
    setIsRandomNameConfirmOpen(false);
    onClose();
  }

  function handleSiteNameChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value.toLowerCase();
    setSiteName(nextValue);
    if (isRandomNameConfirmOpen) {
      setIsRandomNameConfirmOpen(false);
    }
    if (siteNameError) {
      setSiteNameError("");
    }
  }

  function handleBackdropClick(event: React.MouseEvent<HTMLDivElement>) {
    if (isDeploying) {
      return;
    }

    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--app-card-border)] bg-[var(--app-panel)] p-6 shadow-[var(--app-shadow-lg)]">
        {showLoading ? (
          <div className="py-8">
            <div className="relative mx-auto mb-6 flex items-center justify-center">
              <div className="absolute h-20 w-20 animate-ping rounded-full border-2 border-[var(--app-btn-primary-bg)]/20" />
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--app-btn-primary-bg)]/10">
                <Rocket size={28} className="animate-bounce text-[var(--app-btn-primary-bg)]" />
              </div>
            </div>

            <p className="text-center text-sm font-medium text-[var(--app-text-heading)]">
              {loadingStatus}
            </p>

            <div className="mx-auto mt-4 h-1 w-full max-w-xs rounded-full bg-[var(--app-hover-bg)]">
              <div
                className="h-full rounded-full bg-[var(--app-btn-primary-bg)] transition-[width] duration-700 ease-linear"
                style={{ width: `${progressWidth}%` }}
              />
            </div>

            <p className="mt-3 text-center text-xs text-[var(--app-text-muted)]">
              {t("doNotClose", language)}
            </p>
          </div>
        ) : showRedeployConfirmation ? (
          <div>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--app-hover-bg)]">
              <RefreshCw size={28} className="text-[var(--app-text-heading)]" />
            </div>

            <h3 className="text-center text-lg font-semibold text-[var(--app-text-heading)]">
              {t("redeployConfirmTitle", language)}
            </h3>
            <p className="mt-2 text-center text-sm text-[var(--app-text-secondary)]">
              {t("redeployConfirmDesc", language)}
            </p>

            {deployUrl ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--app-hover-bg)] px-3 py-2">
                <Globe size={13} className="shrink-0 text-[var(--app-text-muted)]" />
                <a
                  href={deployUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-xs text-[var(--app-text-secondary)] hover:text-[var(--app-text-heading)] hover:underline"
                >
                  {deployUrl}
                </a>
              </div>
            ) : null}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl bg-[var(--app-hover-bg)] px-4 py-2.5 text-sm font-medium text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg-strong)]"
              >
                {t("cancel", language)}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full rounded-xl bg-[var(--app-btn-primary-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:-translate-y-px hover:bg-[var(--app-btn-primary-hover)]"
              >
                {t("updateSite", language)}
              </button>
            </div>
          </div>
        ) : showConfirmation ? (
          <div>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--app-hover-bg)]">
              <Rocket size={28} className="text-[var(--app-text-heading)]" />
            </div>

            <h3 className="text-center text-lg font-semibold text-[var(--app-text-heading)]">
              {t("deployConfirmTitle", language)}
            </h3>
            <p className="mt-2 text-center text-sm text-[var(--app-text-secondary)]">
              {t("deployConfirmDesc", language)}
            </p>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-[var(--app-text-secondary)]">
                {t("customSiteNameOptional", language)}
              </label>
              <div className="flex items-center rounded-xl border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-3">
                <input
                  type="text"
                  value={siteName}
                  onChange={handleSiteNameChange}
                  placeholder={t("customSiteNamePlaceholder", language)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-10 w-full bg-transparent text-sm text-[var(--app-text-heading)] outline-none placeholder:text-[var(--app-text-muted)]"
                />
                <span className="shrink-0 text-xs text-[var(--app-text-muted)]">
                  .netlify.app
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--app-text-muted)]">
                {t("customSiteNameHint", language)}
              </p>
              {siteNameError ? (
                <p className="mt-2 text-xs text-rose-400">{siteNameError}</p>
              ) : null}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl bg-[var(--app-hover-bg)] px-4 py-2.5 text-sm font-medium text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg-strong)]"
              >
                {t("cancel", language)}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full rounded-xl bg-[var(--app-btn-primary-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:-translate-y-px hover:bg-[var(--app-btn-primary-hover)]"
              >
                {t("deploy", language)}
              </button>
            </div>
          </div>
        ) : showRandomNameConfirmation ? (
          <div>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--app-hover-bg)]">
              <Globe size={26} className="text-[var(--app-text-heading)]" />
            </div>

            <h3 className="text-center text-lg font-semibold text-[var(--app-text-heading)]">
              {t("randomUrlConfirmTitle", language)}
            </h3>
            <p className="mt-2 text-center text-sm text-[var(--app-text-secondary)]">
              {t("randomUrlConfirmDesc", language)}
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setIsRandomNameConfirmOpen(false)}
                className="w-full rounded-xl bg-[var(--app-hover-bg)] px-4 py-2.5 text-sm font-medium text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg-strong)]"
              >
                {t("goBack", language)}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full rounded-xl bg-[var(--app-btn-primary-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:-translate-y-px hover:bg-[var(--app-btn-primary-hover)]"
              >
                {t("continueDeploy", language)}
              </button>
            </div>
          </div>
        ) : showError ? (
          <div>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15">
              <AlertCircle size={26} className="text-rose-400" />
            </div>

            <h3 className="text-center text-lg font-semibold text-[var(--app-text-heading)]">
              {t("deploymentFailed", language)}
            </h3>
            <p className="mt-2 text-center text-sm text-[var(--app-text-secondary)]">
              {deployError}
            </p>

            {!hasDeployed ? (
              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-medium text-[var(--app-text-secondary)]">
                  {t("customSiteNameOptional", language)}
                </label>
                <div className="flex items-center rounded-xl border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-3">
                  <input
                    type="text"
                    value={siteName}
                    onChange={handleSiteNameChange}
                    placeholder={t("customSiteNamePlaceholder", language)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="h-10 w-full bg-transparent text-sm text-[var(--app-text-heading)] outline-none placeholder:text-[var(--app-text-muted)]"
                  />
                  <span className="shrink-0 text-xs text-[var(--app-text-muted)]">
                    .netlify.app
                  </span>
                </div>
                <p className="mt-2 text-xs text-[var(--app-text-muted)]">
                  {t("customSiteNameHint", language)}
                </p>
                {siteNameError ? (
                  <p className="mt-2 text-xs text-rose-400">{siteNameError}</p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full rounded-xl bg-[var(--app-btn-primary-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:-translate-y-px hover:bg-[var(--app-btn-primary-hover)]"
              >
                {t("tryAgain", language)}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl bg-[var(--app-hover-bg)] px-4 py-2.5 text-sm font-medium text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg-strong)]"
              >
                {t("cancel", language)}
              </button>
            </div>
          </div>
        ) : showSuccess && deployUrl ? (
          <div>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15">
              <Check size={26} className="text-emerald-400" />
            </div>

            <h3 className="text-center text-lg font-semibold text-[var(--app-text-heading)]">
              {t("siteLive", language)}
            </h3>
            <p className="mt-1 text-center text-sm text-[var(--app-text-tertiary)]">
              {t("deployedSuccessfully", language)}
            </p>

            <div className="mt-5 rounded-xl border border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-3">
              <div className="flex items-center gap-2">
                <Globe size={14} className="shrink-0 text-[var(--app-text-muted)]" />
                <a
                  href={deployUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--app-text-heading)] hover:underline"
                >
                  {deployUrl}
                </a>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--app-hover-bg)] text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg-strong)]"
                  title={t("copy", language)}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  window.open(deployUrl, "_blank", "noopener,noreferrer");
                  handleClose();
                }}
                className="w-full rounded-xl bg-[var(--app-btn-primary-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:-translate-y-px hover:bg-[var(--app-btn-primary-hover)]"
              >
                {t("openSite", language)}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl bg-[var(--app-hover-bg)] px-4 py-2.5 text-sm font-medium text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg-strong)]"
              >
                {t("cancel", language)}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--app-hover-bg)]">
              <Rocket size={28} className="text-[var(--app-text-heading)]" />
            </div>

            <h3 className="text-center text-lg font-semibold text-[var(--app-text-heading)]">
              {t("deployConfirmTitle", language)}
            </h3>
            <p className="mt-2 text-center text-sm text-[var(--app-text-secondary)]">
              {t("deployConfirmDesc", language)}
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl bg-[var(--app-hover-bg)] px-4 py-2.5 text-sm font-medium text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg-strong)]"
              >
                {t("cancel", language)}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full rounded-xl bg-[var(--app-btn-primary-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:-translate-y-px hover:bg-[var(--app-btn-primary-hover)]"
              >
                {t("deploy", language)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
