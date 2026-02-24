import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getChatMessages } from "@/shared/services/chat-service";
import {
  getWebsiteByChatId,
  getGeneratedHtml,
} from "@/server/services/website-service";
import { getCurrentUser, getUserProfile } from "@/shared/services/user-service";
import BuilderView from "@/client/features/builder/builder-view";

type ChatPageProps = {
  params: Promise<{ chatId: string }>;
};

/**
 * Chat page - loads chat messages and website preview,
 * then renders the split-view builder interface.
 */
export default async function ChatPage({ params }: ChatPageProps) {
  const { chatId } = await params;
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser(supabase);

  // Run independent queries in parallel to avoid waterfall latency
  const [chatResult, messages, website, profile] = await Promise.all([
    supabase.from("chats").select("id, title").eq("id", chatId).single(),
    getChatMessages(supabase, chatId),
    getWebsiteByChatId(supabase, chatId),
    user ? getUserProfile(supabase, user.id) : Promise.resolve(null),
  ]);

  if (chatResult.error || !chatResult.data) {
    redirect("/");
  }

  const chat = chatResult.data;
  const html = website ? await getGeneratedHtml(supabase, website.id) : null;

  return (
    <BuilderView
      chatId={chatId}
      chatTitle={chat.title ?? "Untitled"}
      initialMessages={messages}
      initialHtml={html}
      currentUserAvatarUrl={profile?.avatarUrl ?? null}
    />
  );
}
