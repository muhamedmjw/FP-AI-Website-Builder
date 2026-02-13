"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Chat } from "@/lib/types/database";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { renameChat, deleteChat } from "@/lib/services/chat-service";
import SidebarHeader from "@/components/dashboard/sidebar-header";
import SidebarFooter from "@/components/dashboard/sidebar-footer";
import NewChatButton from "@/components/dashboard/new-chat-button";
import ChatList from "@/components/dashboard/chat-list";

type SidebarProps = {
  chats: Chat[];
  userName: string | null;
  userEmail: string | null;
  userAvatarUrl: string | null;
  activeChatId?: string;
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
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [userName, setUserName] = useState<string | null>(initialUserName);
  const [userEmail, setUserEmail] = useState<string | null>(initialUserEmail);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(
    initialUserAvatarUrl
  );

  // Sync chat list when the server re-fetches (e.g. after router.refresh())
  useEffect(() => {
    setChats(initialChats);
  }, [initialChats]);
  const pathActiveChatId = pathname.startsWith("/builder/")
    ? pathname.split("/")[2]
    : undefined;
  const resolvedActiveChatId = activeChatId ?? pathActiveChatId;

  async function handleRename(chatId: string, newTitle: string) {
    try {
      const supabase = getSupabaseBrowserClient();
      await renameChat(supabase, chatId, newTitle);

      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, title: newTitle } : c))
      );
    } catch (error) {
      console.error("Failed to rename chat:", error);
    }
  }

  async function handleDelete(chatId: string) {
    try {
      const supabase = getSupabaseBrowserClient();
      await deleteChat(supabase, chatId);

      setChats((prev) => prev.filter((c) => c.id !== chatId));

      // If deleting the active chat, go back to dashboard
      if (chatId === resolvedActiveChatId) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  }

  return (
    <aside className="relative flex h-screen w-80 flex-col bg-[var(--app-panel)]/95 shadow-[12px_0_36px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(380px_180px_at_20%_0%,rgba(167,139,250,0.06),transparent_70%)]" />
      {/* Top: brand + greeting */}
      <div className="relative z-10">
        <SidebarHeader userName={userName} userAvatarUrl={userAvatarUrl} />
      </div>

      {/* New website button */}
      <div className="relative z-10">
        <NewChatButton />
      </div>

      {/* Scrollable chat list */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <ChatList
          chats={chats}
          activeChatId={resolvedActiveChatId}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      </div>

      {/* Bottom: account menu */}
      <div className="relative z-10">
        <SidebarFooter
          userName={userName}
          userEmail={userEmail}
          userAvatarUrl={userAvatarUrl}
          onProfileUpdated={(nextProfile) => {
            setUserName(nextProfile.name);
            setUserEmail(nextProfile.email);
            setUserAvatarUrl(nextProfile.avatarUrl);
          }}
        />
      </div>
    </aside>
  );
}
