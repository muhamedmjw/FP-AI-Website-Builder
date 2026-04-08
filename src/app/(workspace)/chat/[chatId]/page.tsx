import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getChatMessages } from "@/shared/services/chat-service";
import {
  getWebsiteByChatId,
  getGeneratedHtml,
} from "@/server/services/website-service";
import { getCurrentUser, getUserProfile } from "@/shared/services/user-service";
import BuilderView from "@/client/features/builder/builder-view";

type PostgresLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function isMissingUploadColumns(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const pgError = error as PostgresLikeError;
  const combinedMessage = [pgError.message, pgError.details, pgError.hint]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return (
    pgError.code === "42703" ||
    (combinedMessage.includes("is_user_upload") && combinedMessage.includes("column")) ||
    (combinedMessage.includes("mime_type") && combinedMessage.includes("column"))
  );
}

function injectUploadedImagesForPreview(
  html: string,
  userImages: Array<{ file_name: string; content: string }>
): string {
  let nextHtml = html;

  for (const image of userImages) {
    const variants = [
      image.file_name,
      `./${image.file_name}`,
      `/${image.file_name}`,
    ];

    for (const variant of variants) {
      const escapedVariant = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      nextHtml = nextHtml.replace(
        new RegExp(`src=["']${escapedVariant}["']`, "gi"),
        `src="${image.content}"`
      );
    }
  }

  return nextHtml;
}

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
    supabase.from("chats").select("id, title").eq("id", chatId).maybeSingle(),
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
        initialHtml = injectUploadedImagesForPreview(html, uploadedImages ?? []);
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
    />
  );
}
