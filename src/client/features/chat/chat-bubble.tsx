"use client";

import { ReactNode, useState } from "react";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

/**
 * Chat message bubble — displays a single user or assistant message.
 * User messages align right, assistant messages align left with an icon.
 */

function MarkdownMessage({
  content,
}: {
  content: string;
}) {
  return (
    <div className="chat-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
          h1: ({ children }) => <h1 className="my-2.5 text-lg font-semibold">{children}</h1>,
          h2: ({ children }) => <h2 className="my-2.5 text-base font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="my-2 text-sm font-semibold">{children}</h3>,
          ul: ({ children }) => (
            <ul className="my-2 list-inside list-disc space-y-1.5 ps-1 marker:opacity-70">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-inside list-decimal space-y-1.5 ps-1 marker:opacity-70">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-7">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-s-2 border-white/25 ps-3 opacity-90">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-2 border-white/15" />,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-(--app-link-text,#67e8f9) hover:opacity-80"
            >
              {children}
            </a>
          ),
          code: ({ children, className }) => {
            const isCodeBlock = Boolean(className?.includes("language-"));

            if (isCodeBlock) {
              return (
                <code className="block overflow-x-auto rounded-lg bg-black/30 px-3 py-2 font-mono text-[0.85em]">
                  {children}
                </code>
              );
            }

            return (
              <code className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-[0.85em]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-lg">{children}</pre>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
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
  const [zoomedImage, setZoomedImage] = useState<
    { src: string; fileName: string } | null
  >(null);

  return (
    <>
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
              ? "bg-(--app-avatar-user-bg) text-(--app-avatar-user-text)"
              : "bg-(--app-avatar-bot-bg) text-(--app-avatar-bot-text)"
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
              className="min-w-0 break-words whitespace-normal rounded-2xl px-3 py-2.5 text-sm leading-relaxed shadow-(--app-shadow-md) sm:px-4 sm:py-3.5 sm:text-base bg-(--app-bubble-user-bg) text-(--app-bubble-user-text)"
              style={{ overflowWrap: "anywhere" }}
            >
              <MarkdownMessage content={content} />
            </div>

            {hasAttachedImages ? (
              <div className="flex flex-wrap gap-2">
                {attachedImages.map((image) => (
                  <div key={image.fileId} className="w-16">
                    <button
                      type="button"
                      onClick={() => setZoomedImage({ src: image.dataUri, fileName: image.fileName })}
                      className="h-16 w-16 overflow-hidden rounded-lg border border-(--app-card-border) bg-(--app-card-bg)"
                      title="Open image"
                      aria-label={`Open ${image.label}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.dataUri}
                        alt={image.fileName}
                        className="h-full w-full object-cover"
                      />
                    </button>
                    <p className="mt-1 truncate text-center text-[10px] text-(--app-text-tertiary)">
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
            className="min-w-0 break-words whitespace-normal rounded-2xl px-3 py-2.5 text-sm leading-relaxed shadow-(--app-shadow-md) sm:px-4 sm:py-3.5 sm:text-base bg-(--app-bubble-bot-bg) text-(--app-bubble-bot-text)"
            style={{ overflowWrap: "anywhere" }}
          >
            <MarkdownMessage content={content} />
          </div>
        )}
      </div>

      {zoomedImage ? (
        <div
          className="fixed inset-0 z-90 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setZoomedImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              className="absolute right-2 top-2 rounded-full border border-white/20 bg-black/60 px-2 py-1 text-xs text-white"
              aria-label="Close image preview"
            >
              Close
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomedImage.src}
              alt={zoomedImage.fileName}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
