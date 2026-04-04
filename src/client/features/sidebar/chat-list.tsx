"use client";

import { Chat } from "@/shared/types/database";
import ChatListItem from "@/client/features/sidebar/chat-list-item";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";

/**
 * Displays the list of user's chat/projects in the sidebar.
 * Each item supports rename and delete via an actions menu.
 */

type ChatListProps = {
  chats: Chat[];
  activeChatId?: string;
  onRename: (chatId: string, newTitle: string) => Promise<void>;
  onArchive: (chatId: string) => Promise<void>;
  onDelete: (
    chatId: string,
    options?: { unpublishLiveSite?: boolean }
  ) => Promise<void>;
};

export default function ChatList({
  chats,
  activeChatId,
  onRename,
  onArchive,
  onDelete,
}: ChatListProps) {
  const { language } = useLanguage();

  if (chats.length === 0) {
    return (
      <div className="px-5 py-9 text-center">
        <p className="text-base text-[var(--app-text-tertiary)]">{t("noProjects", language)}</p>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          {t("startPrompt", language)}
        </p>
      </div>
    );
  }

  return (
    <nav className="space-y-2 px-4 pb-4">
      {chats.map((chat) => (
        <ChatListItem
          key={chat.id}
          chat={chat}
          isActive={chat.id === activeChatId}
          onRename={onRename}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      ))}
    </nav>
  );
}
