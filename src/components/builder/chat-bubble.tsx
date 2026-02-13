/**
 * Chat message bubble — displays a single user or assistant message.
 */

type ChatBubbleProps = {
  role: "user" | "assistant" | "system";
  content: string;
};

export default function ChatBubble({ role, content }: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-white text-slate-900"
            : "bg-slate-800 text-slate-200"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
