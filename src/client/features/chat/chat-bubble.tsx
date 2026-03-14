"use client";

import { Bot, User } from "lucide-react";

/**
 * Chat message bubble — displays a single user or assistant message.
 * User messages align right, assistant messages align left with an icon.
 */

/**
 * Simple regex-based markdown renderer for assistant messages.
 * Supports bold, italic, inline code, links, and line breaks.
 */
function renderMarkdown(text: string): string {
  let html = text
    // Escape HTML entities first to prevent XSS
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  // Inline code (backticks) — process before bold/italic so backtick content is preserved
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="rounded bg-black/20 px-1.5 py-0.5 text-[0.85em] font-mono">$1</code>'
  );

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic: *text* (but not inside already-processed bold tags)
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");

  // Links: [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline text-[var(--app-link-text)] hover:opacity-80">$1</a>'
  );

  // Line breaks
  html = html.replace(/\n/g, "<br/>");

  return html;
}

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
      dir="ltr"
      className={`ui-fade-up flex min-w-0 max-w-[92%] items-start gap-2 sm:max-w-[78%] sm:gap-2.5 ${
        isUser
          ? "ml-auto flex-row-reverse chat-bubble-user"
          : "mr-auto"
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
        {/* Avatar icon */}
        {!isUser && <Bot size={16} />}
        {isUser && !userAvatarUrl && <User size={16} />}
        {isUser && userAvatarUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={userAvatarUrl}
            alt="Your profile picture"
            className="h-7 w-7 rounded-full object-cover sm:h-9 sm:w-9"
          />
        )}
      </div>

      {/* Message */}
      {isUser ? (
        <div
          dir="auto"
          className="min-w-0 overflow-hidden break-words rounded-2xl px-3 py-2.5 text-sm leading-relaxed shadow-[var(--app-shadow-md)] sm:px-4 sm:py-3.5 sm:text-base bg-[var(--app-bubble-user-bg)] text-[var(--app-bubble-user-text)]"
          style={{ overflowWrap: "anywhere" }}
        >
          {content}
        </div>
      ) : (
        <div
          dir="auto"
          className="min-w-0 overflow-hidden break-words rounded-2xl px-3 py-2.5 text-sm leading-relaxed shadow-[var(--app-shadow-md)] sm:px-4 sm:py-3.5 sm:text-base bg-[var(--app-bubble-bot-bg)] text-[var(--app-bubble-bot-text)]"
          style={{ overflowWrap: "anywhere" }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      )}
    </div>
  );
}
