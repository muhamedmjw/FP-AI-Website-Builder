"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { HistoryMessage } from "@/shared/types/database";
import ChatPanel from "@/client/pages/workspace/chat-panel";
import { savePendingGuestZipPrompt } from "@/client/lib/zip-download";
import { savePendingGuestChatSession } from "@/client/lib/guest-chat-handoff";
import ZipArtifactCard from "@/client/pages/workspace/zip-artifact-card";

type GuestZipArtifact = {
  id: string;
  anchorMessageId: string;
  zipName: string;
  fileCount: number;
  folderCount: number;
  createdAt: string;
  prompt: string;
};

function createGuestMessage(
  role: "user" | "assistant",
  content: string
): HistoryMessage {
  return {
    id: crypto.randomUUID(),
    chat_id: "guest-session",
    role,
    content,
    created_at: new Date().toISOString(),
  };
}

function buildGuestAssistantReply(content: string): string {
  return `Starter package ready for "${content}". Use Download ZIP to continue.`;
}

export default function GuestHomePage() {
  const [messages, setMessages] = useState<HistoryMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [artifacts, setArtifacts] = useState<GuestZipArtifact[]>([]);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [pendingDownloadPrompt, setPendingDownloadPrompt] = useState("");

  async function handleSend(content: string) {
    if (isSending) {
      return;
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return;
    }

    setIsSending(true);

    const userMessage = createGuestMessage("user", trimmedContent);
    const assistantMessage = createGuestMessage(
      "assistant",
      buildGuestAssistantReply(trimmedContent)
    );

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setArtifacts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        anchorMessageId: assistantMessage.id,
        zipName: "website-files.zip",
        fileCount: 1,
        folderCount: 0,
        createdAt: new Date().toISOString(),
        prompt: trimmedContent,
      },
    ]);
    setIsSending(false);
  }

  function openAuthGate(prompt: string) {
    if (!prompt.trim()) {
      return;
    }

    setPendingDownloadPrompt(prompt);
    setAuthGateOpen(true);
  }

  function queueDownloadAndContinue() {
    if (!pendingDownloadPrompt) {
      return;
    }

    savePendingGuestChatSession(messages);
    savePendingGuestZipPrompt(pendingDownloadPrompt);
    setAuthGateOpen(false);
    setPendingDownloadPrompt("");
  }

  function closeAuthGate() {
    setAuthGateOpen(false);
    setPendingDownloadPrompt("");
  }

  function queueChatSessionForAuth() {
    savePendingGuestChatSession(messages);
  }

  const inlineAttachments = artifacts.map((artifact) => ({
    id: artifact.id,
    anchorMessageId: artifact.anchorMessageId,
    node: (
      <ZipArtifactCard
        zipName={artifact.zipName}
        fileCount={artifact.fileCount}
        folderCount={artifact.folderCount}
        createdAt={artifact.createdAt}
        onDownload={() => openAuthGate(artifact.prompt)}
      />
    ),
  }));

  return (
    <div className="flex h-full min-h-screen flex-col bg-[var(--app-bg)]">
      <header className="border-b border-white/[0.08] bg-black/15 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles size={17} className="prismatic-icon" />
            <p className="prismatic-text text-sm font-semibold uppercase tracking-[0.2em]">
              AI Website Builder
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/signin"
              onClick={queueChatSessionForAuth}
              className="rounded-lg border border-white/[0.14] px-3 py-1.5 text-sm font-medium text-neutral-200 transition hover:border-white/[0.28] hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              onClick={queueChatSessionForAuth}
              className="rainbow-hover prismatic-shadow rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
            >
              Create account
            </Link>
          </div>
        </div>
        <p className="mx-auto mt-2 w-full max-w-5xl text-xs text-neutral-500">
          Guest chats are temporary and not saved to history.
        </p>
      </header>

      <div className="min-h-0 flex-1">
        <ChatPanel
          messages={messages}
          onSend={handleSend}
          isSending={isSending}
          currentUserAvatarUrl={null}
          showHeader={false}
          centerInputWhenEmpty
          inputPlaceholder="Describe the website you want to build..."
          inlineAttachments={inlineAttachments}
        />
      </div>

      {authGateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeAuthGate();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#151515] p-6 shadow-[0_24px_48px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-neutral-100">
                  Sign in required
                </h3>
                <p className="mt-1 text-sm text-neutral-400">
                  Create an account or sign in to download this ZIP package.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAuthGate}
                className="rounded-lg p-2 text-neutral-500 transition hover:bg-white/10 hover:text-neutral-200"
                title="Close dialog"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              <Link
                href="/signin"
                onClick={queueDownloadAndContinue}
                className="rounded-lg border border-white/[0.14] px-3 py-2.5 text-center text-sm font-medium text-neutral-200 transition hover:border-white/[0.28] hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                onClick={queueDownloadAndContinue}
                className="rainbow-hover prismatic-shadow rounded-lg bg-white px-3 py-2.5 text-center text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
