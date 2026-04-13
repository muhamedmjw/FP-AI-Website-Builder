"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Eye, MessageCircle } from "lucide-react";
import { HistoryMessage } from "@/shared/types/database";
import { useMobileHeaderTitle } from "@/client/components/mobile-header-title-context";
import ChatPanel from "@/client/features/chat/chat-panel";
import PreviewPanel from "@/client/features/preview/preview-panel";
import DeployModal from "@/client/features/preview/deploy-modal";
import PreviewErrorBoundary from "@/client/features/preview/preview-error-boundary";
import ResizeHandle from "@/client/features/builder/resize-handle";
import { useBuilderState } from "@/client/features/builder/hooks/use-builder-state";
import { useDeployActions } from "@/client/features/builder/hooks/use-deploy-actions";
import { useEditorSync } from "@/client/features/builder/hooks/use-editor-sync";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";

/**
 * Builder view - main split layout.
 * Chat is always visible; preview appears only when generated HTML exists.
 * On mobile, a tab bar switches between Chat and Preview.
 */

type BuilderViewProps = {
  chatId: string;
  chatTitle?: string;
  initialMessages: HistoryMessage[];
  initialHtml: string | null;
  initialDeployUrl?: string | null;
  isAuthenticated?: boolean;
  currentUserAvatarUrl?: string | null;
};

/** Minimum preview width in pixels */
const MIN_PREVIEW_WIDTH = 625;
/** Minimum chat panel width in pixels */
const MIN_CHAT_WIDTH = 610;
/** Default preview width as a fraction of the container (0-1) */
const DEFAULT_PREVIEW_FRACTION = 0.52;
const PREVIEW_WIDTH_STORAGE_KEY = "builder-preview-width";

export default function BuilderView({
  chatId,
  chatTitle = "Untitled",
  initialMessages,
  initialHtml,
  initialDeployUrl = null,
  isAuthenticated = true,
  currentUserAvatarUrl = null,
}: BuilderViewProps) {
  const { language } = useLanguage();
  const hasInitialPreview =
    typeof initialHtml === "string" && initialHtml.trim().length > 0;

  const { setTitle } = useMobileHeaderTitle();
  const containerRef = useRef<HTMLDivElement>(null);

  // Set mobile header title to chat title
  useEffect(() => {
    setTitle(chatTitle);
    return () => setTitle("");
  }, [chatTitle, setTitle]);

  const [inputErrorMessage, setInputErrorMessage] = useState("");

  // Preview panel state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  // Mobile tab state: "chat" | "preview"
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");
  const [mobilePreviewMode, setMobilePreviewMode] = useState<"preview" | "editor">("preview");

  const ensurePreviewOpen = useCallback(() => {
    setPreviewOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
  }, []);

  const {
    isDownloading,
    downloadSuccess,
    isDeploying,
    deployState,
    deployError,
    isDeployModalOpen,
    setIsDeployModalOpen,
    canRedeploy,
    markPendingDeployUpdate,
    handleDownloadZip,
    handleDeploy,
    clearDeployError,
  } = useDeployActions({
    chatId,
    initialDeployUrl,
    language,
    setInputErrorMessage,
  });

  const {
    html,
    isSaving,
    hasUnsavedChanges,
    applyGeneratedHtml,
    handleEditorChange,
    handleHtmlRestored,
    handleSaveEditorChanges,
  } = useEditorSync({
    chatId,
    initialHtml,
    language,
    hasDeployed: deployState.hasDeployed,
    onMarkPendingDeployUpdate: markPendingDeployUpdate,
    onEnsurePreviewOpen: ensurePreviewOpen,
    onClosePreview: closePreview,
  });

  const hasPreview = typeof html === "string" && html.trim().length > 0;

  const {
    messages,
    messageImages,
    isSending,
    pendingGenerationStartedAt,
    handleSend,
    handleStop,
    handleInputImagesChange,
  } = useBuilderState({
    chatId,
    initialMessages,
    isAuthenticated,
    language,
    setInputErrorMessage,
    onApplyGeneratedHtml: applyGeneratedHtml,
  });

  const activeMobileTab = hasPreview ? mobileTab : "chat";
  const activeMobilePreviewMode = hasPreview ? mobilePreviewMode : "preview";

  const clampPreviewWidth = useCallback(
    (width: number, containerWidth: number) => {
      const maxPreview = containerWidth - MIN_CHAT_WIDTH;
      return Math.max(MIN_PREVIEW_WIDTH, Math.min(width, maxPreview));
    },
    []
  );

  // Initialise preview width lazily from container width
  const getInitialWidth = useCallback((containerWidth: number) => {
    const initial = Math.round(containerWidth * DEFAULT_PREVIEW_FRACTION);
    const maxAllowed = containerWidth - MIN_CHAT_WIDTH;
    return Math.min(initial, maxAllowed);
  }, []);

  const handleResize = useCallback(
    (deltaX: number) => {
      setIsResizing(true);
      setPreviewWidth((prev) => {
        const container = containerRef.current;
        if (!container) return prev;

        const containerWidth = container.offsetWidth;
        const current = prev ?? getInitialWidth(containerWidth);

        // Moving handle right shrinks preview; left grows preview.
        const next = current - deltaX;

        return clampPreviewWidth(next, containerWidth);
      });
    },
    [clampPreviewWidth, getInitialWidth]
  );

  useEffect(() => {
    if (!previewOpen) return;

    setPreviewWidth((prev) => {
      const container = containerRef.current;
      if (!container) return prev;

      const containerWidth = container.offsetWidth;
      let current = prev;

      if (current === null) {
        try {
          const saved = window.localStorage.getItem(PREVIEW_WIDTH_STORAGE_KEY);
          const parsed = saved ? parseInt(saved, 10) : NaN;

          if (Number.isFinite(parsed) && parsed >= MIN_PREVIEW_WIDTH) {
            current = parsed;
          }
        } catch {
          // Ignore storage access failures.
        }
      }

      const nextCurrent = current ?? getInitialWidth(containerWidth);
      return clampPreviewWidth(nextCurrent, containerWidth);
    });
  }, [previewOpen, clampPreviewWidth, getInitialWidth]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);

    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    const nextWidth = clampPreviewWidth(
      previewWidth ?? getInitialWidth(containerWidth),
      containerWidth
    );

    setPreviewWidth(nextWidth);

    try {
      window.localStorage.setItem(PREVIEW_WIDTH_STORAGE_KEY, String(nextWidth));
    } catch {
      // Ignore storage access failures.
    }
  }, [clampPreviewWidth, getInitialWidth, previewWidth]);

  return (
    <div
      ref={containerRef}
      className="flex h-full min-w-0 flex-col overflow-hidden bg-[radial-gradient(1000px_420px_at_50%_-140px,rgba(167,139,250,0.06),transparent_62%),var(--app-bg)]"
    >
      {/* Mobile tab bar */}
      <div
        className={`flex shrink-0 border-b border-[var(--app-border)] md:hidden overflow-hidden transition-all duration-300 ${
          hasPreview ? "max-h-12 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
          <button
            type="button"
            onClick={() => setMobileTab("chat")}
            className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
              activeMobileTab === "chat"
                ? "border-b-2 border-[var(--app-btn-primary-bg)] text-[var(--app-text-heading)]"
                : "text-[var(--app-text-tertiary)] hover:text-[var(--app-text-secondary)]"
            }`}
          >
            <MessageCircle size={16} />
            {t("chat", language)}
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeMobileTab !== "preview") {
                setMobileTab("preview");
                setMobilePreviewMode("preview");
                return;
              }

              setMobilePreviewMode((prev) =>
                prev === "preview" ? "editor" : "preview"
              );
            }}
            className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
              activeMobileTab === "preview"
                ? "border-b-2 border-[var(--app-btn-primary-bg)] text-[var(--app-text-heading)]"
                : "text-[var(--app-text-tertiary)] hover:text-[var(--app-text-secondary)]"
            }`}
            title={`${t("preview", language)} (${t("editor", language)})`}
          >
            <Eye size={16} />
            {activeMobileTab === "preview" && activeMobilePreviewMode === "editor"
              ? t("editor", language)
              : t("preview", language)}
            <ArrowLeftRight size={12} className="opacity-70" aria-hidden="true" />
          </button>
      </div>

      {/* Desktop: side-by-side split layout */}
      <div className="builder-desktop-split hidden min-h-0 flex-1 md:flex">
        {/* Left: Chat panel */}
        <div className="flex min-w-0 flex-1 flex-col">
          <ChatPanel
            chatId={chatId}
            chatTitle={chatTitle}
            messages={messages}
            messageImages={messageImages}
            onSend={handleSend}
            onStop={handleStop}
            onImagesChange={handleInputImagesChange}
            onTogglePreview={() => setPreviewOpen((prev) => !prev)}
            previewOpen={previewOpen}
            hasPreview={hasPreview}
            isSending={isSending}
            sendingStartedAtMs={pendingGenerationStartedAt}
            currentUserAvatarUrl={currentUserAvatarUrl}
            inputErrorMessage={inputErrorMessage}
            showHeader={false}
          />
        </div>

        {hasPreview ? (
          <>
            {/* Resize handle */}
            {previewOpen && (
              <ResizeHandle onResize={handleResize} onResizeEnd={handleResizeEnd} />
            )}

            {/* Right: Preview panel */}
            {previewOpen ? (
              <div
                className="shrink-0 bg-[var(--app-bg-soft)]/90 shadow-[-12px_0_32px_rgba(0,0,0,0.15)]"
                style={{
                  width: previewWidth ?? "55%",
                  pointerEvents: isResizing ? "none" : "auto",
                }}
              >
                <PreviewErrorBoundary>
                  <PreviewPanel
                    html={html}
                    chatId={chatId}
                    onChange={handleEditorChange}
                    onSave={handleSaveEditorChanges}
                    isSaving={isSaving}
                    hasUnsavedChanges={hasUnsavedChanges}
                    onHtmlRestored={handleHtmlRestored}
                    isAuthenticated={isAuthenticated}
                    onOpenDeployModal={() => setIsDeployModalOpen(true)}
                    isDeployModalOpen={isDeployModalOpen}
                    canRedeploy={canRedeploy}
                    deployUrl={deployState.url}
                    hasDeployed={deployState.hasDeployed}
                    hasPendingDeployUpdate={deployState.hasPendingUpdate}
                    onDownload={() => void handleDownloadZip()}
                    isDownloading={isDownloading}
                    downloadSuccess={downloadSuccess}
                  />
                </PreviewErrorBoundary>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Mobile: tab-switched views */}
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        {/* Show chat tab or full chat when no preview */}
        <div className={`min-h-0 flex-1 flex-col ${!hasPreview || activeMobileTab === "chat" ? "flex" : "hidden"}`}>
          <ChatPanel
            chatId={chatId}
            chatTitle={chatTitle}
            messages={messages}
            messageImages={messageImages}
            onSend={handleSend}
            onStop={handleStop}
            onImagesChange={handleInputImagesChange}
            onTogglePreview={() => setPreviewOpen((prev) => !prev)}
            previewOpen={previewOpen}
            hasPreview={hasPreview}
            isSending={isSending}
            sendingStartedAtMs={pendingGenerationStartedAt}
            currentUserAvatarUrl={currentUserAvatarUrl}
            inputErrorMessage={inputErrorMessage}
            showHeader={false}
          />
        </div>

        {/* Mobile preview tab */}
        {hasPreview && activeMobileTab === "preview" && (
          <div className="min-h-0 flex-1">
            <PreviewErrorBoundary>
              <PreviewPanel
                html={html}
                chatId={chatId}
                onChange={handleEditorChange}
                onSave={handleSaveEditorChanges}
                isSaving={isSaving}
                hasUnsavedChanges={hasUnsavedChanges}
                onHtmlRestored={handleHtmlRestored}
                isAuthenticated={isAuthenticated}
                onOpenDeployModal={() => setIsDeployModalOpen(true)}
                isDeployModalOpen={isDeployModalOpen}
                canRedeploy={canRedeploy}
                deployUrl={deployState.url}
                hasDeployed={deployState.hasDeployed}
                hasPendingDeployUpdate={deployState.hasPendingUpdate}
                onDownload={() => void handleDownloadZip()}
                isDownloading={isDownloading}
                downloadSuccess={downloadSuccess}
                activePanelOverride={activeMobilePreviewMode}
                showModeToggle={false}
              />
            </PreviewErrorBoundary>
          </div>
        )}
      </div>

      <DeployModal
        isOpen={isDeployModalOpen}
        onClose={() => {
          setIsDeployModalOpen(false);
          clearDeployError();
        }}
        onConfirm={(siteName) => {
          void handleDeploy(siteName);
        }}
        isDeploying={isDeploying}
        deployUrl={deployState.url}
        deployError={deployError}
        hasDeployed={deployState.hasDeployed}
        canRedeploy={canRedeploy}
      />
    </div>
  );
}
