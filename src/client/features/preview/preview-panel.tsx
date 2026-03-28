import { useRef, useState } from "react";
import {
  Globe,
  Download,
  Check,
  History,
  Eye,
  Code,
  Share2,
  Copy,
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
  isPublic?: boolean;
  shareUrl?: string | null;
  isSharing?: boolean;
  onShareToggle?: (isPublic: boolean) => void | Promise<void>;
  onDeploy?: () => void | Promise<void>;
  isDeploying?: boolean;
  deployUrl?: string | null;
  deployError?: string;
  hasDeployed?: boolean;
  onDownload?: () => void;
  isDownloading?: boolean;
  downloadSuccess?: boolean;
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
  isPublic = false,
  shareUrl = null,
  isSharing = false,
  onShareToggle,
  onDeploy,
  isDeploying = false,
  deployUrl = null,
  deployError = "",
  hasDeployed = false,
  onDownload,
  isDownloading = false,
  downloadSuccess = false,
}: PreviewPanelProps) {
  const { language } = useLanguage();
  const shouldFixToolbarOrder = RTL_LANGUAGES.includes(language);
  const [activePanel, setActivePanel] = useState<"preview" | "editor">("preview");
  const hasMountedEditor = useRef(false);
  const [editorMounted, setEditorMounted] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copiedShareUrl, setCopiedShareUrl] = useState(false);

  const resolvedShareUrl = shareUrl ?? (chatId ? `/preview/${chatId}` : "");

  async function handleShareSwitch() {
    if (!onShareToggle) return;
    await onShareToggle(!isPublic);
  }

  async function handleCopyShareUrl() {
    if (!resolvedShareUrl) return;

    try {
      await navigator.clipboard.writeText(resolvedShareUrl);
      setCopiedShareUrl(true);
      setTimeout(() => setCopiedShareUrl(false), 1400);
    } catch {
      setCopiedShareUrl(false);
    }
  }

  function handlePanelSwitch(nextPanel: "preview" | "editor") {
    if (nextPanel === "editor") {
      if (!onChange) return;
      if (!hasMountedEditor.current) {
        hasMountedEditor.current = true;
        setEditorMounted(true);
      }
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
        dir={shouldFixToolbarOrder ? "ltr" : undefined}
        className="flex h-12 shrink-0 items-center gap-1.5 border-b border-[var(--app-border)] bg-[var(--app-panel)] px-3"
      >
        {onChange ? (
          <div className="mr-1 flex items-center rounded-full bg-[var(--app-hover-bg)] p-0.5">
            <button
              type="button"
              onClick={() => handlePanelSwitch("preview")}
              className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition ${
                activePanel === "preview"
                  ? "bg-[var(--app-card-bg)] text-[var(--app-text-heading)] shadow-[var(--app-shadow-sm)]"
                  : "text-[var(--app-text-tertiary)] hover:text-[var(--app-text-secondary)]"
              }`}
              title={t("preview", language)}
            >
              <Eye size={13} />
              {t("preview", language)}
            </button>
            <button
              type="button"
              onClick={() => handlePanelSwitch("editor")}
              className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition ${
                activePanel === "editor"
                  ? "bg-[var(--app-card-bg)] text-[var(--app-text-heading)] shadow-[var(--app-shadow-sm)]"
                  : "text-[var(--app-text-tertiary)] hover:text-[var(--app-text-secondary)]"
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
            className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-2.5 text-xs font-medium text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)]"
            title={t("history", language)}
          >
            <History size={14} />
            {t("history", language)}
          </button>
        ) : null}

        {isAuthenticated && onShareToggle ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsShareOpen((open) => !open)}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-2.5 text-xs font-medium text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)]"
              title={t("share", language)}
            >
              <Share2 size={14} />
              {t("share", language)}
            </button>

            {isShareOpen ? (
              <div className="absolute right-0 top-10 z-30 w-72 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3 shadow-[var(--app-shadow-lg)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-[var(--app-text-secondary)]">
                    {t("publicSharing", language)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleShareSwitch()}
                    disabled={isSharing}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      isPublic
                        ? "bg-[var(--app-btn-primary-bg)]"
                        : "bg-[var(--app-hover-bg-strong)]"
                    } disabled:opacity-60`}
                    title={t("publicSharing", language)}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        isPublic ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <p className="mt-2 text-xs text-[var(--app-text-tertiary)]">
                  {isSharing
                    ? t("saving", language)
                    : isPublic
                      ? t("shareEnabledHint", language)
                      : t("shareDisabledHint", language)}
                </p>

                {isPublic ? (
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      readOnly
                      value={resolvedShareUrl}
                      className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-2.5 py-2 text-xs text-[var(--app-text-secondary)] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCopyShareUrl()}
                      className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--app-border)] text-xs font-medium text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)]"
                    >
                      <Copy size={13} />
                      {copiedShareUrl ? t("copied", language) : t("copyLink", language)}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {isAuthenticated && onDeploy ? (
          deployUrl && !isDeploying ? (
            <a
              href={deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-2.5 text-xs font-medium text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)]"
            >
              <Rocket size={14} />
              {t("viewSite", language)}
            </a>
          ) : (
            <button
              type="button"
              onClick={() => void onDeploy()}
              disabled={isDeploying}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition ${
                deployError
                  ? "border-rose-400/50 text-rose-400"
                  : "border-[var(--app-border)] text-[var(--app-text-secondary)] hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)]"
              } disabled:pointer-events-none disabled:opacity-70`}
            >
              {isDeploying ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
              ) : (
                <Rocket size={14} />
              )}
              {isDeploying
                ? t("deploying", language)
                : deployError
                  ? t("deployFailed", language)
                  : t("deploy", language)}
            </button>
          )
        ) : null}

        {isAuthenticated && hasDeployed ? (
          <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-400">
            {t("deployed", language)}
          </span>
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
            activePanel === "preview"
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

        {onChange && editorMounted ? (
          <div
            dir="ltr"
            className={`absolute inset-0 transition-opacity duration-150 ${
              activePanel === "editor"
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
