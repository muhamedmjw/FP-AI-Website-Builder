"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/client/lib/supabase-browser";
import { t } from "@/shared/constants/translations";
import type { AppLanguage } from "@/shared/types/database";
import type { DeploymentRow } from "@/shared/types/sidebar";

type DeployRecordRow = {
  id: string;
  website_id: string;
  deploy_url: string | null;
  status: string | null;
  created_at: string;
  netlify_site_id: string | null;
};

type WebsiteSummaryRow = {
  id: string;
  chat_id: string;
  updated_at: string;
};

type ChatSummaryRow = {
  id: string;
  title: string;
  updated_at: string;
};

/**
 * Encapsulates deployed-website loading and rename actions used in the sidebar.
 */
export default function useDeploymentsData(language: AppLanguage) {
  const [deployments, setDeployments] = useState<DeploymentRow[]>([]);
  const [deploymentsError, setDeploymentsError] = useState("");
  const [isDeploymentsLoading, setIsDeploymentsLoading] = useState(false);
  const [editingWebsiteId, setEditingWebsiteId] = useState<string | null>(null);
  const [editingWebsiteName, setEditingWebsiteName] = useState("");
  const [renamingWebsiteId, setRenamingWebsiteId] = useState<string | null>(null);

  async function loadDeployments() {
    setIsDeploymentsLoading(true);
    setDeploymentsError("");

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(t("sessionExpiredPleaseSignInAgain", language));
      }

      const { data: deployData, error: deployError } = await supabase
        .from("deploys")
        .select("id, website_id, deploy_url, status, created_at, netlify_site_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (deployError) {
        throw deployError;
      }

      const deployRecords = (deployData ?? []) as DeployRecordRow[];
      if (deployRecords.length === 0) {
        setDeployments([]);
        return;
      }

      const groupedByWebsite = new Map<
        string,
        { latest: DeployRecordRow; firstDeployedAt: string; deployCount: number }
      >();

      for (const deployRecord of deployRecords) {
        if (!deployRecord.website_id) {
          continue;
        }

        const existingGroup = groupedByWebsite.get(deployRecord.website_id);
        if (!existingGroup) {
          groupedByWebsite.set(deployRecord.website_id, {
            latest: deployRecord,
            firstDeployedAt: deployRecord.created_at,
            deployCount: 1,
          });
          continue;
        }

        existingGroup.deployCount += 1;
        existingGroup.firstDeployedAt = deployRecord.created_at;
      }

      const websiteIds = [...groupedByWebsite.keys()];
      if (websiteIds.length === 0) {
        setDeployments([]);
        return;
      }

      const { data: websitesData, error: websitesError } = await supabase
        .from("websites")
        .select("id, chat_id, updated_at")
        .in("id", websiteIds);

      if (websitesError) {
        throw websitesError;
      }

      const websites = (websitesData ?? []) as WebsiteSummaryRow[];
      const websiteById = new Map(websites.map((website) => [website.id, website]));

      const uniqueChatIds = [...new Set(websites.map((website) => website.chat_id).filter(Boolean))];
      let chatsById = new Map<string, ChatSummaryRow>();

      if (uniqueChatIds.length > 0) {
        const { data: chatsData, error: chatsError } = await supabase
          .from("chats")
          .select("id, title, updated_at")
          .in("id", uniqueChatIds);

        if (chatsError) {
          throw chatsError;
        }

        chatsById = new Map(
          ((chatsData ?? []) as ChatSummaryRow[]).map((chat) => [chat.id, chat])
        );
      }

      const nextDeployments = websiteIds
        .map((websiteId) => {
          const grouped = groupedByWebsite.get(websiteId);
          if (!grouped) {
            return null;
          }

          const website = websiteById.get(websiteId);
          const chat = website?.chat_id ? chatsById.get(website.chat_id) : null;
          const websiteName = chat?.title?.trim() || t("untitledWebsite", language);
          const updatedAt = website?.updated_at ?? chat?.updated_at ?? grouped.latest.created_at;

          return {
            websiteId,
            chatId: website?.chat_id ?? null,
            websiteName,
            deployUrl: grouped.latest.deploy_url,
            status: grouped.latest.status ?? "unknown",
            deployCount: grouped.deployCount,
            firstDeployedAt: grouped.firstDeployedAt,
            lastDeployedAt: grouped.latest.created_at,
            updatedAt,
            netlifySiteId: grouped.latest.netlify_site_id,
          } satisfies DeploymentRow;
        })
        .filter((deployment): deployment is DeploymentRow => deployment !== null)
        .sort(
          (a, b) =>
            new Date(b.lastDeployedAt).getTime() - new Date(a.lastDeployedAt).getTime()
        );

      setDeployments(nextDeployments);
    } catch (error) {
      console.error("Failed to load deployed websites:", error);
      setDeploymentsError(
        error instanceof Error ? error.message : t("deploymentsLoadFailed", language)
      );
    } finally {
      setIsDeploymentsLoading(false);
    }
  }

  function startRename(row: DeploymentRow) {
    if (!row.chatId) {
      return;
    }

    setEditingWebsiteId(row.websiteId);
    setEditingWebsiteName(row.websiteName);
  }

  function cancelRename() {
    setEditingWebsiteId(null);
    setEditingWebsiteName("");
  }

  async function saveWebsiteName(row: DeploymentRow) {
    if (!row.chatId) {
      return;
    }

    const nextWebsiteName = editingWebsiteName.trim();
    if (!nextWebsiteName) {
      setDeploymentsError(t("websiteNameRequired", language));
      return;
    }

    setRenamingWebsiteId(row.websiteId);
    setDeploymentsError("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("chats")
        .update({ title: nextWebsiteName })
        .eq("id", row.chatId);

      if (error) {
        throw error;
      }

      setDeployments((previousDeployments) =>
        previousDeployments.map((deployment) =>
          deployment.websiteId === row.websiteId
            ? {
                ...deployment,
                websiteName: nextWebsiteName,
                updatedAt: new Date().toISOString(),
              }
            : deployment
        )
      );

      cancelRename();
    } catch (error) {
      console.error("Failed to rename deployed website:", error);
      setDeploymentsError(
        error instanceof Error ? error.message : t("couldNotSaveChanges", language)
      );
    } finally {
      setRenamingWebsiteId(null);
    }
  }

  return {
    deployments,
    deploymentsError,
    isDeploymentsLoading,
    editingWebsiteId,
    editingWebsiteName,
    renamingWebsiteId,
    setDeploymentsError,
    setEditingWebsiteName,
    loadDeployments,
    startRename,
    cancelRename,
    saveWebsiteName,
  };
}
