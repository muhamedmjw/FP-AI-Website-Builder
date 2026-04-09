import { useCallback, useEffect, useState } from "react";
import { downloadWebsiteZip } from "@/client/lib/zip-download";
import { t } from "@/shared/constants/translations";
import type { AppLanguage } from "@/shared/types/database";

export type DeployState = {
  url: string | null;
  hasDeployed: boolean;
  hasPendingUpdate: boolean;
};

type UseDeployActionsParams = {
  chatId: string;
  initialDeployUrl: string | null;
  language: AppLanguage;
  setInputErrorMessage: (message: string) => void;
};

export function useDeployActions({
  chatId,
  initialDeployUrl,
  language,
  setInputErrorMessage,
}: UseDeployActionsParams) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployState, setDeployState] = useState<DeployState>({
    url: initialDeployUrl,
    hasDeployed: Boolean(initialDeployUrl),
    hasPendingUpdate: false,
  });
  const [deployError, setDeployError] = useState("");
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);

  const canRedeploy = deployState.hasDeployed && !isDeploying;
  const clearDeployError = useCallback(() => {
    setDeployError("");
  }, []);

  useEffect(() => {
    let resolvedUrl: string | null = initialDeployUrl;

    try {
      const storedUrl = window.sessionStorage.getItem(`deploy-url:${chatId}`);
      if (storedUrl) {
        resolvedUrl = storedUrl;
      }
    } catch {
      // Ignore storage access failures.
    }

    setDeployState({
      url: resolvedUrl,
      hasDeployed: Boolean(resolvedUrl),
      hasPendingUpdate: false,
    });
  }, [chatId, initialDeployUrl]);

  const markPendingDeployUpdate = useCallback(() => {
    setDeployState((prev) => {
      if (!prev.hasDeployed) {
        return prev;
      }

      return {
        ...prev,
        hasPendingUpdate: true,
      };
    });
  }, []);

  const handleDownloadZip = useCallback(async () => {
    setInputErrorMessage("");
    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      await downloadWebsiteZip(chatId);
      setIsDownloading(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    } catch (error) {
      console.error("Failed to download ZIP:", error);
      setInputErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to download ZIP. Please try again."
      );
      setIsDownloading(false);
    }
  }, [chatId, setInputErrorMessage]);

  const handleDeploy = useCallback(async (siteName?: string) => {
    setInputErrorMessage("");
    setDeployError("");
    setIsDeploying(true);

    try {
      const response = await fetch("/api/website/deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chatId, siteName }),
      });

      const data = (await response.json()) as
        | { deployUrl?: string; error?: string }
        | null;

      if (!response.ok || typeof data?.deployUrl !== "string") {
        throw new Error(data?.error ?? t("deployFailed", language));
      }

      setDeployState({
        url: data.deployUrl,
        hasDeployed: true,
        hasPendingUpdate: false,
      });

      try {
        window.sessionStorage.setItem(`deploy-url:${chatId}`, data.deployUrl);
      } catch {
        // Ignore storage access failures.
      }

      window.open(data.deployUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("deployFailed", language);
      setDeployError(message);
    } finally {
      setIsDeploying(false);
    }
  }, [chatId, language, setInputErrorMessage]);

  return {
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
  };
}
