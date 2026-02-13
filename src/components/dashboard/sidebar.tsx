"use client";

import { useState } from "react";
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
  activeChatId?: string;
};

/**
 * Main sidebar component — assembles header, new-chat button,
 * chat list, and footer into one vertical column.
 */
export default function Sidebar({
  chats: initialChats,
  userName,
  activeChatId,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [chats, setChats] = useState<Chat[]>(initialChats);
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
    <aside className="flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-950">
      {/* Top: brand + greeting */}
      <SidebarHeader userName={userName} />

      {/* New website button */}
      <NewChatButton />

      {/* Scrollable chat list */}
      <div className="flex-1 overflow-y-auto">
        <ChatList
          chats={chats}
          activeChatId={resolvedActiveChatId}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      </div>

      {/* Bottom: sign out */}
      <SidebarFooter />
    </aside>
  );
}
