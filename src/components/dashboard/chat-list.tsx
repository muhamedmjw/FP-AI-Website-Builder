import { Chat } from "@/lib/types/database";

/**
 * Displays the list of user's chat/projects in the sidebar.
 * Each item is a clickable card that navigates to the builder.
 */

type ChatListProps = {
  chats: Chat[];
  activeChatId?: string;
};

export default function ChatList({ chats, activeChatId }: ChatListProps) {
  if (chats.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-slate-500">No projects yet.</p>
        <p className="mt-1 text-xs text-slate-600">
          Click &quot;New Website&quot; to start.
        </p>
      </div>
    );
  }

  return (
    <nav className="space-y-1 px-3">
      {chats.map((chat) => {
        const isActive = chat.id === activeChatId;

        return (
          <a
            key={chat.id}
            href={`/builder/${chat.id}`}
            className={`block rounded-lg px-3 py-2.5 text-sm transition ${
              isActive
                ? "bg-slate-800 text-white"
                : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100"
            }`}
          >
            <p className="truncate font-medium">{chat.title}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {new Date(chat.updated_at).toLocaleDateString()}
            </p>
          </a>
        );
      })}
    </nav>
  );
}
