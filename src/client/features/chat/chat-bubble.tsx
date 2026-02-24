import { Bot, User } from "lucide-react";

/**
 * Chat message bubble — displays a single user or assistant message.
 * User messages align right, assistant messages align left with an icon.
 */

type ChatBubbleProps = {
  role: "user" | "assistant" | "system";
  content: string;
  userAvatarUrl?: string | null;
};

export default function ChatBubble({
  role,
  content,
  userAvatarUrl = null,
}: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={`ui-fade-up flex min-w-0 max-w-[92%] items-start gap-2 sm:max-w-[78%] sm:gap-2.5 ${
        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-9 sm:w-9 ${
          isUser && !userAvatarUrl
            ? "bg-[var(--app-avatar-user-bg)] text-[var(--app-avatar-user-text)]"
            : "bg-[var(--app-avatar-bot-bg)] text-[var(--app-avatar-bot-text)]"
        }`}
      >
        {isUser ? (
          userAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userAvatarUrl}
              alt="Your profile picture"
              className="h-7 w-7 rounded-full object-cover sm:h-9 sm:w-9"
            />
          ) : (
            <User size={16} />
          )
        ) : (
          <Bot size={16} />
        )}
      </div>

      {/* Message */}
      <div
        className={`min-w-0 overflow-hidden break-words rounded-2xl px-3 py-2.5 text-sm leading-relaxed shadow-[var(--app-shadow-md)] sm:px-4 sm:py-3.5 sm:text-base ${
          isUser
            ? "bg-[var(--app-bubble-user-bg)] text-[var(--app-bubble-user-text)]"
            : "bg-[var(--app-bubble-bot-bg)] text-[var(--app-bubble-bot-text)]"
        }`}
        style={{ overflowWrap: "anywhere" }}
      >
        {content}
      </div>
    </div>
  );
}
