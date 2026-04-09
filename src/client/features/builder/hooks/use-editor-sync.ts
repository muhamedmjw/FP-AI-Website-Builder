import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "@/shared/constants/translations";
import type { AppLanguage } from "@/shared/types/database";

type UseEditorSyncParams = {
  chatId: string;
  initialHtml: string | null;
  language: AppLanguage;
  hasDeployed: boolean;
  onMarkPendingDeployUpdate: () => void;
  onEnsurePreviewOpen: () => void;
  onClosePreview: () => void;
};

export function useEditorSync({
  chatId,
  initialHtml,
  language,
  hasDeployed,
  onMarkPendingDeployUpdate,
  onEnsurePreviewOpen,
  onClosePreview,
}: UseEditorSyncParams) {
  const [html, setHtml] = useState<string | null>(initialHtml);
  const currentHtmlRef = useRef<string>(initialHtml ?? "");
  const lastSavedHtmlRef = useRef<string>(initialHtml ?? "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setHtml(initialHtml);
    currentHtmlRef.current = initialHtml ?? "";
    lastSavedHtmlRef.current = initialHtml ?? "";
  }, [chatId, initialHtml]);

  const applyGeneratedHtml = useCallback((generatedHtml: string) => {
    const nextHtml = generatedHtml.trim();

    if (nextHtml.length > 0) {
      currentHtmlRef.current = generatedHtml;
      lastSavedHtmlRef.current = generatedHtml;
      setHtml(generatedHtml);
      onEnsurePreviewOpen();
      return;
    }

    currentHtmlRef.current = "";
    setHtml(null);
    onClosePreview();
  }, [onClosePreview, onEnsurePreviewOpen]);

  const handleEditorChange = useCallback((nextHtml: string) => {
    currentHtmlRef.current = nextHtml;
    setHtml(nextHtml);

    if (nextHtml.trim().length > 0) {
      onEnsurePreviewOpen();
    }
  }, [onEnsurePreviewOpen]);

  const handleHtmlRestored = useCallback((restoredHtml: string) => {
    currentHtmlRef.current = restoredHtml;
    setHtml(restoredHtml);
    lastSavedHtmlRef.current = restoredHtml;
    onEnsurePreviewOpen();
  }, [onEnsurePreviewOpen]);

  const handleSaveEditorChanges = useCallback(async () => {
    const currentHtml = currentHtmlRef.current;

    setIsSaving(true);

    try {
      const response = await fetch("/api/website/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chatId, html: currentHtml }),
      });

      const data = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? t("couldNotSaveChanges", language));
      }

      lastSavedHtmlRef.current = currentHtml;

      if (hasDeployed) {
        onMarkPendingDeployUpdate();
      }
    } finally {
      setIsSaving(false);
    }
  }, [chatId, hasDeployed, language, onMarkPendingDeployUpdate]);

  const currentHtml = html ?? "";
  const hasUnsavedChanges = currentHtml !== lastSavedHtmlRef.current;

  return {
    html,
    isSaving,
    hasUnsavedChanges,
    applyGeneratedHtml,
    handleEditorChange,
    handleHtmlRestored,
    handleSaveEditorChanges,
  };
}
