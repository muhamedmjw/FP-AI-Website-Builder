import { SupabaseClient } from "@supabase/supabase-js";
import { AI_CONFIG } from "@/shared/constants/ai";
import {
  countReferencedUserImagePaths,
  forceApplyUploadedImagesToHtml,
  injectUploadedImagesForPreview,
  normalizeGeneratedHtmlForStorage,
  type HtmlImageAsset,
} from "@/shared/utils/html-images";
import { isMissingUploadColumns } from "@/shared/utils/db-guards";
import type { AppLanguage, Website } from "@/shared/types/database";
import type { generateAIResponse } from "@/server/services/ai-service";
import {
  createWebsite,
  getWebsiteByChatId,
  saveGeneratedHtml,
} from "@/server/services/website-service";

type PostgresLikeError = {
  code?: string;
};

export async function checkUserTokenBudget(
  supabase: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const today = new Date().toISOString().split("T")[0];

  const { data: userChats, error: chatsError } = await supabase
    .from("chats")
    .select("id")
    .eq("user_id", userId);

  if (chatsError || !userChats || userChats.length === 0) {
    return { allowed: true };
  }

  const chatIds = userChats.map((c) => c.id);

  const { data: generations, error: genError } = await supabase
    .from("ai_generations")
    .select("total_tokens")
    .in("chat_id", chatIds)
    .eq("status", "success")
    .gte("created_at", `${today}T00:00:00.000Z`)
    .lte("created_at", `${today}T23:59:59.999Z`);

  if (genError) {
    return { allowed: true };
  }

  const tokensUsedToday = (generations ?? []).reduce(
    (sum, row) => sum + (row.total_tokens ?? 0),
    0
  );

  if (tokensUsedToday >= AI_CONFIG.DAILY_TOKEN_LIMIT) {
    return {
      allowed: false,
      reason: `You've used your daily 500,000 token budget. Resets at midnight UTC. (Used: ${tokensUsedToday.toLocaleString()} / 500,000)`,
    };
  }

  return { allowed: true };
}

/**
 * Loads selected and available uploaded images for a website.
 * This keeps route handlers focused on orchestration instead of query details.
 */
export async function resolveUserImages(
  supabase: SupabaseClient,
  websiteId: string | null,
  selectedImageFileIds: string[]
): Promise<{
  userImages: HtmlImageAsset[];
  websiteImagePool: HtmlImageAsset[];
}> {
  if (!websiteId) {
    return { userImages: [], websiteImagePool: [] };
  }

  let userImages: HtmlImageAsset[] = [];
  let websiteImagePool: HtmlImageAsset[] = [];

  if (selectedImageFileIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from("files")
        .select("id, file_name, content")
        .eq("website_id", websiteId)
        .eq("is_user_upload", true)
        .in("id", selectedImageFileIds);

      if (error) {
        throw error;
      }

      const imageById = new Map(
        (data ?? []).map((row) => [
          row.id,
          {
            fileName: row.file_name,
            dataUri: row.content,
          },
        ])
      );

      userImages = selectedImageFileIds
        .map((id) => imageById.get(id))
        .filter((image): image is HtmlImageAsset => Boolean(image));
    } catch (error) {
      if (isMissingUploadColumns(error)) {
        userImages = [];
      } else {
        throw error;
      }
    }
  }

  try {
    const { data, error } = await supabase
      .from("files")
      .select("file_name, content")
      .eq("website_id", websiteId)
      .eq("is_user_upload", true)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    websiteImagePool = (data ?? []).map((row) => ({
      fileName: row.file_name,
      dataUri: row.content,
    }));
  } catch (error) {
    if (isMissingUploadColumns(error)) {
      websiteImagePool = [];
    } else {
      throw error;
    }
  }

  if (websiteImagePool.length === 0 && userImages.length > 0) {
    websiteImagePool = userImages;
  }

  return { userImages, websiteImagePool };
}

function promptRequestsUploadedImageSwap(prompt: string): boolean {
  const normalizedPrompt = prompt.toLowerCase();

  const hasActionWord = /(replace|swap|change|use|apply|set|update)/.test(
    normalizedPrompt
  );
  const hasImageWord = /image/.test(normalizedPrompt);
  const hasUploadHint = /(uploaded|attach|attached|image\s*[1-9])/.test(
    normalizedPrompt
  );

  return hasActionWord && hasImageWord && hasUploadHint;
}

/**
 * Converts AI output into persisted HTML and preview HTML.
 * It also forces uploaded-image replacement when the prompt explicitly asks for it.
 */
export function handleHtmlGeneration(params: {
  aiResponse: Awaited<ReturnType<typeof generateAIResponse>>;
  existingWebsiteId: string | null;
  existingHtml: string | null;
  content: string;
  userImages: HtmlImageAsset[];
  websiteImagePool: HtmlImageAsset[];
}): {
  htmlToSave: string | null;
  htmlForPreview?: string;
} {
  const {
    aiResponse,
    existingWebsiteId,
    existingHtml,
    content,
    userImages,
    websiteImagePool,
  } = params;

  const trimmedContent = content.trim();
  const shouldForceUploadedImageSwap =
    promptRequestsUploadedImageSwap(trimmedContent) && userImages.length > 0;

  let htmlToSave: string | null = null;
  let htmlForPreview: string | undefined;

  if (aiResponse.type === "website") {
    let normalizedHtml = normalizeGeneratedHtmlForStorage(aiResponse.html, userImages);

    if (shouldForceUploadedImageSwap) {
      const referencedImageCount = countReferencedUserImagePaths(
        normalizedHtml,
        userImages
      );

      if (referencedImageCount === 0) {
        const fallbackHtml =
          existingHtml && existingHtml.trim().length > 0
            ? existingHtml
            : normalizedHtml;

        const forcedReplacement = forceApplyUploadedImagesToHtml(
          fallbackHtml,
          userImages,
          trimmedContent
        );

        if (forcedReplacement.replacedCount > 0) {
          normalizedHtml = forcedReplacement.html;
        }
      }
    }

    htmlToSave = normalizedHtml;
    htmlForPreview = injectUploadedImagesForPreview(normalizedHtml, websiteImagePool);
  } else if (existingWebsiteId && existingHtml && shouldForceUploadedImageSwap) {
    const forcedReplacement = forceApplyUploadedImagesToHtml(
      existingHtml,
      userImages,
      trimmedContent
    );

    if (forcedReplacement.replacedCount > 0) {
      htmlToSave = forcedReplacement.html;
      htmlForPreview = injectUploadedImagesForPreview(
        forcedReplacement.html,
        websiteImagePool
      );
    }
  }

  return { htmlToSave, htmlForPreview };
}

/**
 * Ensures a website exists for a chat and saves generated HTML when present.
 * Handles create-race conflicts safely and keeps website language in sync.
 */
export async function saveWebsiteRecord(params: {
  supabase: SupabaseClient;
  chatId: string;
  businessPrompt: string;
  language: AppLanguage;
  existingWebsite: Website | null;
  htmlToSave: string | null;
}): Promise<Website | null> {
  const {
    supabase,
    chatId,
    businessPrompt,
    language,
    existingWebsite,
    htmlToSave,
  } = params;

  if (!htmlToSave) {
    return existingWebsite;
  }

  let website = existingWebsite;

  if (!website) {
    try {
      website = await createWebsite(supabase, chatId, businessPrompt.trim(), language);
    } catch (error) {
      const maybePostgresError = error as PostgresLikeError;

      if (maybePostgresError.code === "23505") {
        website = await getWebsiteByChatId(supabase, chatId);
      } else {
        throw error;
      }
    }
  }

  if (!website) {
    throw new Error("Failed to resolve website after creation race.");
  }

  if (website.language !== language) {
    const { error: updateLanguageError } = await supabase
      .from("websites")
      .update({ language })
      .eq("id", website.id);

    if (updateLanguageError) {
      throw updateLanguageError;
    }
  }

  await saveGeneratedHtml(supabase, website.id, htmlToSave);
  return website;
}
