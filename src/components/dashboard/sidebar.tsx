"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Chat } from "@/lib/types/database";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { createChat } from "@/lib/services/chat-service";
import SidebarHeader from "@/components/dashboard/sidebar-header";
import SidebarFooter from "@/components/dashboard/sidebar-footer";
import NewChatButton from "@/components/dashboard/new-chat-button";
import ChatList from "@/components/dashboard/chat-list";

type SidebarProps = {
  chats: Chat[];
  userName: string | null;
  userId: string;
  activeChatId?: string;
};

/**
 * Main sidebar component — assembles header, new-chat button,
 * chat list, and footer into one vertical column.
 */
export default function Sidebar({
  chats: initialChats,
  userName,
  userId,
  activeChatId,
}: SidebarProps) {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [isCreating, setIsCreating] = useState(false);

  async function handleNewChat() {
    setIsCreating(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const newChat = await createChat(supabase, userId);

      setChats((prev) => [newChat, ...prev]);
      router.push(`/builder/${newChat.id}`);
    } catch (error) {
      console.error("Failed to create chat:", error);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-950">
      {/* Top: brand + greeting */}
      <SidebarHeader userName={userName} />

      {/* New website button */}
      <NewChatButton onClick={handleNewChat} disabled={isCreating} />

      {/* Scrollable chat list */}
      <div className="flex-1 overflow-y-auto">
        <ChatList chats={chats} activeChatId={activeChatId} />
      </div>

      {/* Bottom: sign out */}
      <SidebarFooter />
    </aside>
  );
}
