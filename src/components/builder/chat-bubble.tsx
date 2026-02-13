import { Bot, User } from "lucide-react";

/**
 * Chat message bubble — displays a single user or assistant message.
 * User messages align right, assistant messages align left with an icon.
 */

type ChatBubbleProps = {
  role: "user" | "assistant" | "system";
  content: string;
};

export default function ChatBubble({ role, content }: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={`flex items-start gap-3.5 ${
        isUser ? "flex-row-reverse" : ""
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-white text-slate-900"
            : "bg-violet-500/20 text-violet-400"
        }`}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Message */}
      <div
        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-white text-slate-900"
            : "bg-slate-800/80 text-slate-200"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
