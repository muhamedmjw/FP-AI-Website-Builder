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
      className={`ui-fade-up flex max-w-[78%] items-start gap-2.5 ${
        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isUser && !userAvatarUrl
            ? "bg-neutral-200 text-neutral-900"
            : "bg-white/[0.08] text-neutral-300"
        }`}
      >
        {isUser ? (
          userAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userAvatarUrl}
              alt="Your profile picture"
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <User size={16} />
          )
        ) : (
          <Bot size={16} className="text-neutral-100" />
        )}
      </div>

      {/* Message */}
      <div
        className={`rounded-2xl px-4 py-3.5 text-base leading-relaxed shadow-[0_10px_24px_rgba(0,0,0,0.25)] ${
          isUser
            ? "bg-white text-neutral-900"
            : "bg-[#1a1a1a] text-neutral-200"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
