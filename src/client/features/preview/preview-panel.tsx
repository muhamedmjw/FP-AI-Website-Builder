import { useState } from "react";
import {
  Globe,
  Download,
  Check,
  History,
  Eye,
  Code,
  RefreshCw,
  Rocket,
} from "lucide-react";
import { useLanguage } from "@/client/lib/language-context";
import { RTL_LANGUAGES } from "@/shared/constants/languages";
import { t } from "@/shared/constants/translations";
import CodeEditorPanel from "@/client/features/editor/code-editor-panel";
import VersionHistoryPanel from "@/client/features/preview/version-history-panel";

/**
 * Preview panel — renders the generated HTML inside a sandboxed iframe
 * with a single unified toolbar and a polished empty state.
 */

type PreviewPanelProps = {
  html: string | null;
  chatId?: string;
  onHtmlRestored?: (html: string) => void;
  onChange?: (html: string) => void;
  onSave?: () => Promise<void>;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  isAuthenticated?: boolean;
  onOpenDeployModal?: () => void;
  isDeployModalOpen?: boolean;
  canRedeploy?: boolean;
  deployUrl?: string | null;
  hasDeployed?: boolean;
  hasPendingDeployUpdate?: boolean;
  onDownload?: () => void;
  isDownloading?: boolean;
  downloadSuccess?: boolean;
  activePanelOverride?: "preview" | "editor";
  showModeToggle?: boolean;
  isGenerating?: boolean;
};

export default function PreviewPanel({
  html,
  chatId,
  onHtmlRestored,
  onChange,
  onSave,
  isSaving = false,
  hasUnsavedChanges = false,
  isAuthenticated = false,
  onOpenDeployModal,
  deployUrl = null,
  hasDeployed = false,
  hasPendingDeployUpdate = false,
  onDownload,
  isDownloading = false,
  downloadSuccess = false,
  activePanelOverride,
  showModeToggle = true,
  isGenerating = false,
}: PreviewPanelProps) {
  const { language } = useLanguage();
  const isRtlLanguage = RTL_LANGUAGES.includes(language);
  const [activePanel, setActivePanel] = useState<"preview" | "editor">("preview");
  const [editorMounted, setEditorMounted] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const effectiveActivePanel =
    activePanelOverride === "editor" && !onChange
      ? "preview"
      : activePanelOverride ?? activePanel;

  function handlePanelToggle() {
    handlePanelSwitch(effectiveActivePanel === "preview" ? "editor" : "preview");
  }

  function ensureEditorPanelMounted() {
    setEditorMounted((mounted) => mounted || true);
  }

  function handlePanelSwitch(nextPanel: "preview" | "editor") {
    if (nextPanel === "editor") {
      if (!onChange) return;
      ensureEditorPanelMounted();
    }

    setActivePanel(nextPanel);
  }

  if (!html) {
    return (
      <div
        className="flex h-full items-center justify-center bg-[var(--app-bg-soft)]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <div className="flex flex-col items-center gap-4 text-center px-6">
          {/* Glowing globe */}
          <div className="relative flex items-center justify-center">
            <div className="absolute h-20 w-20 rounded-full bg-indigo-500/15 animate-pulse" />
            <Globe size={40} className="relative text-indigo-400" />
          </div>
          <p className="text-base font-semibold text-[var(--app-text-heading)]">
            Your website preview
          </p>
          <p className="max-w-[240px] text-sm text-[var(--app-text-muted)]">
            Describe a website in the chat to see it here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col bg-[var(--app-bg-soft)]"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Single unified toolbar */}
      <div
        dir={isRtlLanguage ? "ltr" : undefined}
        className="flex h-12 shrink-0 items-center gap-1.5 overflow-x-auto border-b border-[var(--app-border)] bg-[var(--app-panel)] px-3"
      >
        {onChange && showModeToggle ? (
          <div
            className={`relative mr-1 flex h-8 w-44 items-center rounded-full border border-[var(--app-border)] bg-[var(--app-bg-soft)] p-[3px] shadow-inner transition-opacity ${
              isGenerating ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {/* Sliding Thumb */}
            <div
              className={`absolute bottom-[3px] left-[3px] top-[3px] w-[calc(50%-3px)] rounded-full bg-[var(--app-panel)] border border-[var(--app-border)] shadow-sm transition-transform duration-300 cubic-bezier(0.22, 1, 0.36, 1) ${
                effectiveActivePanel === "preview" ? "translate-x-0" : "translate-x-full"
              }`}
            />
            <button
              type="button"
              onClick={() => handlePanelSwitch("preview")}
              className={`relative z-10 flex h-full flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors duration-300 ${
                effectiveActivePanel === "preview"
                  ? "text-[var(--app-text-heading)]"
                  : "text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)]"
              }`}
              title={t("preview", language)}
            >
              <Eye size={13} />
              {t("preview", language)}
            </button>
            <button
              type="button"
              onClick={() => handlePanelSwitch("editor")}
              className={`relative z-10 flex h-full flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors duration-300 ${
                effectiveActivePanel === "editor"
                  ? "text-[var(--app-text-heading)]"
                  : "text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)]"
              }`}
              title={t("editor", language)}
            >
              <Code size={13} />
              {t("editor", language)}
            </button>
          </div>
        ) : null}

        {/* Spacer */}
        <div className="flex-1" />

        {chatId && onHtmlRestored ? (
          <button
            type="button"
            onClick={() => setIsHistoryOpen((open) => !open)}
            disabled={isGenerating}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-2.5 text-xs font-medium text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)] disabled:cursor-not-allowed disabled:opacity-50"
            title={t("history", language)}
            aria-label={t("history", language)}
          >
            <History size={14} />
            {t("history", language)}
          </button>
        ) : null}

        {isAuthenticated ? (
          deployUrl && hasDeployed ? (
            <>
              <a
                href={deployUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-2.5 text-xs font-medium text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)]"
              >
                <Rocket size={14} />
                Visit
              </a>
              <button
                type="button"
                onClick={() => onOpenDeployModal?.()}
                className="relative flex h-8 items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-2.5 text-xs font-medium text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)]"
              >
                <RefreshCw size={13} />
                {t("updateSite", language)}
                {hasPendingDeployUpdate ? (
                  <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_0_1px_rgba(2,6,23,0.7)]" />
                ) : null}
              </button>
              {hasPendingDeployUpdate ? (
                <span className="inline-flex max-w-20 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-500/10 px-2 py-1 text-center text-[10px] font-semibold leading-[1.15] text-sky-300 break-words">
                  {t("deployUpdateNeeded", language)}
                </span>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              onClick={() => onOpenDeployModal?.()}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-2.5 text-xs font-medium text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)]"
            >
              <Rocket size={14} />
              {t("deploy", language)}
            </button>
          )
        ) : null}

        {/* Right: Download ZIP */}
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-black shadow-sm transition-all hover:-translate-y-0.5 hover:bg-neutral-100 hover:shadow-md disabled:pointer-events-none disabled:opacity-70"
            title={t("downloadZip", language)}
          >
            {isDownloading ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
            ) : downloadSuccess ? (
              <Check size={14} />
            ) : (
              <Download size={14} />
            )}
            {isDownloading
              ? t("downloadZipPreparing", language)
              : downloadSuccess
                ? t("downloadZipDone", language)
                : t("downloadZip", language)}
          </button>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          className={`absolute inset-0 transition-opacity duration-150 ${
            effectiveActivePanel === "preview"
              ? "opacity-100"
              : "pointer-events-none opacity-0"
          }`}
        >
          <iframe
            title="Website Preview"
            srcDoc={html}
            sandbox="allow-scripts allow-same-origin allow-popups"
            className="h-full w-full border-0 bg-white"
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        {onChange && (editorMounted || effectiveActivePanel === "editor") ? (
          <div
            dir="ltr"
            className={`absolute inset-0 transition-opacity duration-150 ${
              effectiveActivePanel === "editor"
                ? "opacity-100"
                : "pointer-events-none opacity-0"
            }`}
          >
            <CodeEditorPanel
              html={html}
              onChange={onChange}
              onSave={onSave ?? (async () => {})}
              isSaving={isSaving}
              hasUnsavedChanges={hasUnsavedChanges}
            />
          </div>
        ) : null}

        {chatId && onHtmlRestored ? (
          <VersionHistoryPanel
            open={isHistoryOpen}
            chatId={chatId}
            onClose={() => setIsHistoryOpen(false)}
            onRestored={onHtmlRestored}
          />
        ) : null}
      </div>
    </div>
  );
}
