"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/client/lib/supabase-browser";
import { t } from "@/shared/constants/translations";
import type { AppLanguage } from "@/shared/types/database";
import type { ArchivedChatRow } from "@/shared/types/sidebar";

/**
 * Manages archived chat listing and restore actions for the sidebar modal.
 */
export default function useArchivedChatsData(language: AppLanguage) {
  const router = useRouter();
  const [archivedChats, setArchivedChats] = useState<ArchivedChatRow[]>([]);
  const [isArchivedChatsLoading, setIsArchivedChatsLoading] = useState(false);
  const [archivedChatsError, setArchivedChatsError] = useState("");
  const [restoringChatId, setRestoringChatId] = useState<string | null>(null);

  async function loadArchivedChats() {
    setIsArchivedChatsLoading(true);
    setArchivedChatsError("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("chats")
        .select("id, title, updated_at, archived_at")
        .not("archived_at", "is", null)
        .order("archived_at", { ascending: false });

      if (error) {
        const maybeMissingArchivedColumn =
          typeof error.message === "string" &&
          error.message.toLowerCase().includes("archived_at") &&
          error.message.toLowerCase().includes("column");

        if (maybeMissingArchivedColumn) {
          throw new Error(t("archiveSupportUnavailable", language));
        }

        throw error;
      }

      const sortedArchivedChats = ((data ?? []) as ArchivedChatRow[]).sort((first, second) => {
        const firstArchivedTime = first.archived_at
          ? new Date(first.archived_at).getTime()
          : 0;
        const secondArchivedTime = second.archived_at
          ? new Date(second.archived_at).getTime()
          : 0;

        return secondArchivedTime - firstArchivedTime;
      });

      setArchivedChats(sortedArchivedChats);
    } catch (error) {
      console.error("Failed to load archived chats:", error);
      setArchivedChatsError(
        error instanceof Error ? error.message : t("archivedChatsLoadFailed", language)
      );
    } finally {
      setIsArchivedChatsLoading(false);
    }
  }

  async function restoreArchivedChat(chatId: string) {
    setRestoringChatId(chatId);
    setArchivedChatsError("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("chats")
        .update({ archived_at: null })
        .eq("id", chatId);

      if (error) {
        throw error;
      }

      setArchivedChats((previousChats) =>
        previousChats.filter((chat) => chat.id !== chatId)
      );
      router.refresh();
    } catch (error) {
      console.error("Failed to restore archived chat:", error);
      setArchivedChatsError(
        error instanceof Error ? error.message : t("couldNotRestoreChat", language)
      );
    } finally {
      setRestoringChatId(null);
    }
  }

  return {
    archivedChats,
    isArchivedChatsLoading,
    archivedChatsError,
    restoringChatId,
    loadArchivedChats,
    restoreArchivedChat,
    setArchivedChatsError,
  };
}
