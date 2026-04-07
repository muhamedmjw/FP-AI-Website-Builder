"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/client/lib/supabase-browser";
import {
  getPendingChatGenerations,
  resolveChatGeneration,
  subscribePendingChatGenerations,
} from "@/client/lib/chat-pending-generations";

const POLL_INTERVAL_MS = 3500;

function toTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

async function isChatStillPending(
  supabase: SupabaseClient,
  chatId: string,
  baselineAssistantCreatedAt: string | null
): Promise<boolean> {
  const { data, error } = await supabase
    .from("history")
    .select("created_at")
    .eq("chat_id", chatId)
    .eq("role", "assistant")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Preserve pending state when status checks fail; the next poll can recover.
    console.error(`Failed to check pending status for chat ${chatId}:`, error);
    return true;
  }

  const latestAssistantAt =
    data && typeof data.created_at === "string" ? data.created_at : null;

  if (!latestAssistantAt) {
    return true;
  }

  if (!baselineAssistantCreatedAt) {
    return false;
  }

  const baselineAssistantTimestamp = toTimestamp(baselineAssistantCreatedAt);
  const latestAssistantTimestamp = toTimestamp(latestAssistantAt);

  if (baselineAssistantTimestamp === null || latestAssistantTimestamp === null) {
    return true;
  }

  return latestAssistantTimestamp <= baselineAssistantTimestamp;
}

/**
 * Watches locally pending chat generations and auto-refreshes when assistant replies arrive.
 * This keeps UI in sync even if the user switched chats or refreshed mid-generation.
 */
export default function PendingChatSync() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const isPollingRef = useRef(false);

  useEffect(() => {
    let isCancelled = false;

    const runPendingSync = async () => {
      if (isCancelled || isPollingRef.current) {
        return;
      }

      const pendingChats = getPendingChatGenerations();

      if (pendingChats.length === 0) {
        return;
      }

      isPollingRef.current = true;

      try {
        const checks = await Promise.all(
          pendingChats.map(async (pendingChat) => ({
            chatId: pendingChat.chatId,
            stillPending: await isChatStillPending(
              supabase,
              pendingChat.chatId,
              pendingChat.baselineAssistantCreatedAt
            ),
          }))
        );

        let resolvedCount = 0;

        for (const check of checks) {
          if (!check.stillPending) {
            resolveChatGeneration(check.chatId);
            resolvedCount += 1;
          }
        }

        if (resolvedCount > 0) {
          router.refresh();
        }
      } finally {
        isPollingRef.current = false;
      }
    };

    void runPendingSync();

    const intervalId = window.setInterval(() => {
      void runPendingSync();
    }, POLL_INTERVAL_MS);

    const unsubscribe = subscribePendingChatGenerations(() => {
      void runPendingSync();
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void runPendingSync();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubscribe();
    };
  }, [pathname, router, supabase]);

  return null;
}
