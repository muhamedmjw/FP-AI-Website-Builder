import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { getChatMessages } from "@/lib/services/chat-service";
import { getWebsiteByChatId, getGeneratedHtml } from "@/lib/services/website-service";
import BuilderView from "@/components/builder/builder-view";

type BuilderPageProps = {
  params: Promise<{ chatId: string }>;
};

/**
 * Builder page — loads chat messages and website preview,
 * then renders the split-view builder interface.
 */
export default async function BuilderPage({ params }: BuilderPageProps) {
  const { chatId } = await params;
  const supabase = await getSupabaseServerClient();

  // Verify the chat exists and belongs to the user (RLS handles this)
  const { data: chat, error } = await supabase
    .from("chats")
    .select("id, title")
    .eq("id", chatId)
    .single();

  if (error || !chat) {
    redirect("/dashboard");
  }

  // Fetch messages and current generated HTML
  const messages = await getChatMessages(supabase, chatId);

  const website = await getWebsiteByChatId(supabase, chatId);
  const html = website ? await getGeneratedHtml(supabase, website.id) : null;

  return (
    <BuilderView
      chatId={chatId}
      chatTitle={chat.title ?? "Untitled"}
      initialMessages={messages}
      initialHtml={html}
    />
  );
}
