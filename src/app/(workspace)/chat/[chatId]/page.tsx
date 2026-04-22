import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getChatMessages } from "@/shared/services/chat-service";
import {
  getWebsiteByChatId,
  getGeneratedHtml,
} from "@/server/services/website-service";
import { getCurrentUser, getUserProfile } from "@/shared/services/user-service";
import { isMissingUploadColumns } from "@/shared/utils/db-guards";
import { injectUploadedImagesForPreview } from "@/shared/utils/html-images";
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

  if (!user) {
    redirect("/signin");
  }

  // Run independent queries in parallel to avoid waterfall latency.
  const [chatResult, messages, website, profile] = await Promise.all([
    supabase.from("chats").select("id, title, is_locked, age_verified, needs_age_verification").eq("id", chatId).maybeSingle(),
    getChatMessages(supabase, chatId).catch((error) => {
      console.error("Failed to load chat messages:", error);
      return [];
    }),
    getWebsiteByChatId(supabase, chatId).catch((error) => {
      console.error("Failed to load chat website:", error);
      return null;
    }),
    getUserProfile(supabase, user.id).catch((error) => {
      console.error("Failed to load chat user profile:", error);
      return null;
    }),
  ]);

  if (chatResult.error || !chatResult.data) {
    redirect("/");
  }

  const chat = chatResult.data;
  const html = website
    ? await getGeneratedHtml(supabase, website.id).catch((error) => {
        console.error("Failed to load generated HTML:", error);
        return null;
      })
    : null;
  let initialHtml = html;

  if (website && html) {
    try {
      const { data: uploadedImages, error: uploadedImagesError } = await supabase
        .from("files")
        .select("file_name, content")
        .eq("website_id", website.id)
        .eq("is_user_upload", true)
        .order("created_at", { ascending: true });

      if (uploadedImagesError) {
        if (!isMissingUploadColumns(uploadedImagesError)) {
          console.error("Failed to load uploaded images for preview injection:", uploadedImagesError);
        }
      } else {
        initialHtml = injectUploadedImagesForPreview(
          html,
          (uploadedImages ?? []).map((image) => ({
            fileName: image.file_name,
            dataUri: image.content,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to inject uploaded images into initial preview:", error);
    }
  }
  let initialDeployUrl: string | null = null;

  if (website && user) {
    const { data: latestDeploy, error: latestDeployError } = await supabase
      .from("deploys")
      .select("deploy_url")
      .eq("website_id", website.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestDeployError) {
      console.error("Failed to load latest deploy record:", latestDeployError);
    } else if (typeof latestDeploy?.deploy_url === "string") {
      initialDeployUrl = latestDeploy.deploy_url;
    }
  }

  return (
    <BuilderView
      chatId={chatId}
      chatTitle={chat.title ?? "Untitled"}
      initialMessages={messages}
      initialHtml={initialHtml}
      initialDeployUrl={initialDeployUrl}
      isAuthenticated
      currentUserAvatarUrl={profile?.avatarUrl ?? null}
      initialIsLocked={chat.is_locked ?? false}
      initialNeedsAgeVerification={chat.needs_age_verification ?? false}
    />
  );
}
