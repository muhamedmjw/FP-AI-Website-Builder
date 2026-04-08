"use client";

import { ReactNode, useState } from "react";
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
    (_, text, url) => {
      const safeUrl = /^https?:\/\//i.test(url) &&
        !/javascript:|data:|vbscript:/i.test(url)
        ? url
        : "#";
      const blockedAttribute = safeUrl === "#" ? ' data-blocked="true"' : "";
      return `<a href="${safeUrl}"${blockedAttribute} target="_blank" rel="noopener noreferrer" class="underline text-[var(--app-link-text,#67e8f9)] hover:opacity-80">${text}</a>`;
    }
  );

  // Line breaks
  html = html.replace(/\n/g, "<br/>");

  return html;
}

type ChatBubbleProps = {
  role: "user" | "assistant" | "system";
  content: string;
  userAvatarUrl?: string | null;
  attachedImages?: Array<{
    fileId: string;
    fileName: string;
    dataUri: string;
    label: string;
  }>;
};

type UserAvatarProps = {
  src: string | null;
  fallbackIcon: ReactNode;
};

function UserAvatar({ src, fallbackIcon }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  if (!src || imgError) {
    return <>{fallbackIcon}</>;
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt="Your profile picture"
      loading="lazy"
      onError={() => setImgError(true)}
      className="h-7 w-7 rounded-full object-cover sm:h-9 sm:w-9"
    />
  );
}

export default function ChatBubble({
  role,
  content,
  userAvatarUrl = null,
  attachedImages = [],
}: ChatBubbleProps) {
  const isUser = role === "user";
  const hasAttachedImages = isUser && attachedImages.length > 0;

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
          <UserAvatar src={userAvatarUrl} fallbackIcon={<User size={16} />} />
        )}
      </div>

      {/* Message */}
      {isUser ? (
        <div className="min-w-0 space-y-2">
          <div
            dir="auto"
            className="min-w-0 overflow-hidden break-words rounded-2xl px-3 py-2.5 text-sm leading-relaxed shadow-[var(--app-shadow-md)] sm:px-4 sm:py-3.5 sm:text-base bg-[var(--app-bubble-user-bg)] text-[var(--app-bubble-user-text)]"
            style={{ overflowWrap: "anywhere" }}
          >
            {content}
          </div>

          {hasAttachedImages ? (
            <div className="flex flex-wrap gap-2">
              {attachedImages.map((image) => (
                <div key={image.fileId} className="w-16">
                  <div className="h-16 w-16 overflow-hidden rounded-lg border border-[var(--app-card-border)] bg-[var(--app-card-bg)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.dataUri}
                      alt={image.fileName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="mt-1 truncate text-center text-[10px] text-[var(--app-text-tertiary)]">
                    {image.label}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
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
