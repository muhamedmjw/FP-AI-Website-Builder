import { Chat } from "@/lib/types/database";
import ChatListItem from "@/components/dashboard/chat-list-item";

/**
 * Displays the list of user's chat/projects in the sidebar.
 * Each item supports rename and delete via an actions menu.
 */

type ChatListProps = {
  chats: Chat[];
  activeChatId?: string;
  onRename: (chatId: string, newTitle: string) => Promise<void>;
  onDelete: (chatId: string) => Promise<void>;
};

export default function ChatList({
  chats,
  activeChatId,
  onRename,
  onDelete,
}: ChatListProps) {
  if (chats.length === 0) {
    return (
      <div className="px-5 py-9 text-center">
        <p className="text-base text-neutral-500">No projects yet.</p>
        <p className="mt-1 text-sm text-neutral-600">
          Click &quot;New Website&quot; to start.
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
          onDelete={onDelete}
        />
      ))}
    </nav>
  );
}
