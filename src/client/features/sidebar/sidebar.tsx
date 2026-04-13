"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Chat } from "@/shared/types/database";
import { getSupabaseBrowserClient } from "@/client/lib/supabase-browser";
import { archiveChat, renameChat, deleteChat } from "@/shared/services/chat-service";
import { abortClientGeneration } from "@/client/lib/client-generation-abort";
import SidebarHeader from "@/client/features/sidebar/sidebar-header";
import SidebarFooter from "@/client/features/sidebar/sidebar-footer";
import NewChatButton from "@/client/features/sidebar/new-chat-button";
import ChatList from "@/client/features/sidebar/chat-list";

type SidebarProps = {
  chats: Chat[];
  userName: string | null;
  userEmail: string | null;
  userAvatarUrl: string | null;
  activeChatId?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

/**
 * Main sidebar component — assembles header, new-chat button,
 * chat list, and footer into one vertical column.
 */
export default function Sidebar({
  chats: initialChats,
  userName: initialUserName,
  userEmail: initialUserEmail,
  userAvatarUrl: initialUserAvatarUrl,
  activeChatId,
  isCollapsed = false,
  onToggleCollapse = () => {},
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [userName, setUserName] = useState<string | null>(initialUserName);
  const [userEmail, setUserEmail] = useState<string | null>(initialUserEmail);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(
    initialUserAvatarUrl
  );
  const [actionErrorMessage, setActionErrorMessage] = useState("");

  // Sync chat list when the server re-fetches (e.g. after router.refresh())
  useEffect(() => {
    setChats(initialChats);
  }, [initialChats]);

  // Sync user profile state when the server re-fetches profile props.
  useEffect(() => {
    setUserName(initialUserName);
    setUserEmail(initialUserEmail);
    setUserAvatarUrl(initialUserAvatarUrl);
  }, [initialUserName, initialUserEmail, initialUserAvatarUrl]);

  const pathActiveChatId = pathname.startsWith("/chat/")
    ? pathname.split("/")[2]
    : undefined;
  const resolvedActiveChatId = activeChatId ?? pathActiveChatId;

  async function handleRename(chatId: string, newTitle: string) {
    try {
      const supabase = getSupabaseBrowserClient();
      await renameChat(supabase, chatId, newTitle);
      setActionErrorMessage("");

      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, title: newTitle } : c))
      );
    } catch (error) {
      console.error("Failed to rename chat:", error);
      setActionErrorMessage("Could not rename this project. Please try again.");
    }
  }

  async function handleArchive(chatId: string) {
    try {
      const supabase = getSupabaseBrowserClient();
      await archiveChat(supabase, chatId);
      setActionErrorMessage("");

      setChats((prev) => prev.filter((c) => c.id !== chatId));

      if (chatId === resolvedActiveChatId) {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to archive chat:", error);
      setActionErrorMessage("Could not archive this project. Please try again.");
    }
  }

  async function handleDelete(
    chatId: string,
    options?: { unpublishLiveSite?: boolean }
  ) {
    try {
      // Abort the client-side fetch instantly (kills the in-flight request)
      abortClientGeneration(chatId);

      // Abort any active AI generation on the server
      try {
        await fetch("/api/chat/abort", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId }),
        });
      } catch {
        // Ignore abort errors — deletion should proceed regardless
      }

      if (options?.unpublishLiveSite) {
        const response = await fetch("/api/chat/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ chatId, unpublishLiveSite: true }),
        });

        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(data?.error ?? "Could not delete this project.");
        }
      } else {
        const supabase = getSupabaseBrowserClient();
        await deleteChat(supabase, chatId);
      }

      setActionErrorMessage("");

      setChats((prev) => prev.filter((c) => c.id !== chatId));

      // If deleting the active chat, go back to app home
      if (chatId === resolvedActiveChatId) {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
      setActionErrorMessage("Could not delete this project. Please try again.");
    }
  }

  const footerProps = {
    userName,
    userEmail,
    userAvatarUrl,
    onProfileUpdated: (nextProfile: { name: string | null; email: string | null; avatarUrl: string | null }) => {
      setUserName(nextProfile.name);
      setUserEmail(nextProfile.email);
      setUserAvatarUrl(nextProfile.avatarUrl);
    },
  };

  return (
    <aside
      dir="ltr"
      className={`sidebar relative z-50 flex h-screen flex-col bg-[var(--app-panel)]/95 shadow-[var(--app-sidebar-shadow)] backdrop-blur-xl motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-in-out ${
        isCollapsed ? "w-16" : "w-80"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(380px_180px_at_20%_0%,rgba(167,139,250,0.06),transparent_70%)]" />
      {/* Top: brand + greeting + compact account avatar (mobile only) */}
      <div
        className={`relative z-20 flex items-start justify-between pb-2 ${
          isCollapsed ? "px-2 pt-4" : "px-5 pt-6"
        }`}
      >
        <SidebarHeader
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
        <div className="md:hidden">
          <SidebarFooter {...footerProps} variant="compact" />
        </div>
      </div>

      {/* New website button */}
      <div className="relative z-10">
        <NewChatButton isCollapsed={isCollapsed} />
      </div>

      {/* Scrollable chat list */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        {!isCollapsed ? (
          <>
            <ChatList
              chats={chats}
              activeChatId={resolvedActiveChatId}
              onRename={handleRename}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
            {actionErrorMessage ? (
              <p className="px-5 pb-3 text-sm text-rose-400" role="status">
                {actionErrorMessage}
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Bottom: account bar (desktop only) */}
      <div
        className={`relative z-10 hidden ${
          isCollapsed
            ? "md:flex md:justify-center md:px-2 md:pb-4"
            : "md:block"
        }`}
      >
        <SidebarFooter
          {...footerProps}
          variant={isCollapsed ? "compact" : "full"}
        />
      </div>
    </aside>
  );
}
