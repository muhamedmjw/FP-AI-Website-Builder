import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";
import { addMessage, getChatMessages } from "@/shared/services/chat-service";
import { getCurrentUser } from "@/shared/services/user-service";
import { generateAIResponse, generateChatTitle } from "@/server/services/ai-service";
import { renameChat } from "@/shared/services/chat-service";
import {
  getWebsiteByChatId,
  getGeneratedHtml,
  createWebsite,
  saveGeneratedHtml,
} from "@/server/services/website-service";
import { AI_CONFIG } from "@/shared/constants/ai";
import { MAX_PROMPT_LENGTH } from "@/shared/constants/limits";
import type { AppLanguage } from "@/shared/types/database";

type PostgresLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const MAX_EXISTING_HTML_PROMPT_CHARS = 140_000;

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
    (combinedMessage.includes("is_user_upload") && combinedMessage.includes("column"))
  );
}

function isAppLanguage(value: unknown): value is AppLanguage {
  return value === "en" || value === "ar" || value === "ku";
}

function normalizeExistingHtmlForPrompt(html: string | null): string | null {
  if (!html) {
    return null;
  }

  let normalized = html.replace(
    /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g,
    "data:image/omitted;base64,[removed]"
  );

  if (normalized.length <= MAX_EXISTING_HTML_PROMPT_CHARS) {
    return normalized;
  }

  const headLength = Math.floor(MAX_EXISTING_HTML_PROMPT_CHARS * 0.6);
  const tailLength = MAX_EXISTING_HTML_PROMPT_CHARS - headLength;

  return [
    normalized.slice(0, headLength),
    "\n<!-- existing html truncated for AI prompt size -->\n",
    normalized.slice(-tailLength),
  ].join("");
}

function normalizeGeneratedHtmlForStorage(
  html: string,
  userImages: Array<{ fileName: string; dataUri: string }>
): string {
  let nextHtml = html;

  for (const image of userImages) {
    if (!image.dataUri || !image.fileName) {
      continue;
    }

    nextHtml = nextHtml.replaceAll(
      `src="${image.dataUri}"`,
      `src="${image.fileName}"`
    );
    nextHtml = nextHtml.replaceAll(
      `src='${image.dataUri}'`,
      `src="${image.fileName}"`
    );
  }

  return nextHtml;
}

function promptRequestsUploadedImageSwap(prompt: string): boolean {
  const normalized = prompt.toLowerCase();

  const hasAction = /(replace|swap|change|use|apply|set|update)/.test(normalized);
  const hasImageWord = /image/.test(normalized);
  const hasUploadHint = /(uploaded|attach|attached|image\s*[1-9])/.test(normalized);

  return hasAction && hasImageWord && hasUploadHint;
}

function countReferencedUserImagePaths(
  html: string,
  userImages: Array<{ fileName: string; dataUri: string }>
): number {
  const normalizedHtml = html.toLowerCase();
  let count = 0;

  for (const image of userImages) {
    const variants = [
      image.fileName,
      `./${image.fileName}`,
      `/${image.fileName}`,
    ];

    if (variants.some((variant) => normalizedHtml.includes(variant.toLowerCase()))) {
      count += 1;
    }
  }

  return count;
}

function replaceImgSrcSequentially(
  html: string,
  userImages: Array<{ fileName: string; dataUri: string }>
): { html: string; replacedCount: number } {
  let imageIndex = 0;
  let replacedCount = 0;

  const nextHtml = html.replace(/<img\b[^>]*>/gi, (imgTag) => {
    if (imageIndex >= userImages.length) {
      return imgTag;
    }

    if (!/\bsrc=(['"]).*?\1/i.test(imgTag)) {
      return imgTag;
    }

    const fileName = userImages[imageIndex]?.fileName;
    if (!fileName) {
      return imgTag;
    }

    imageIndex += 1;
    replacedCount += 1;

    return imgTag.replace(/\bsrc=(['"]).*?\1/i, `src="${fileName}"`);
  });

  return { html: nextHtml, replacedCount };
}

function forceApplyUploadedImagesToHtml(
  html: string,
  userImages: Array<{ fileName: string; dataUri: string }>,
  prompt: string
): { html: string; replacedCount: number } {
  if (userImages.length === 0) {
    return { html, replacedCount: 0 };
  }

  if (/featured\s+projects?/i.test(prompt)) {
    let replacedInSection = 0;
    const sectionAdjusted = html.replace(
      /<section\b[^>]*>[\s\S]*?<\/section>/gi,
      (sectionHtml) => {
        if (!/featured\s+projects?/i.test(sectionHtml)) {
          return sectionHtml;
        }

        const replaced = replaceImgSrcSequentially(sectionHtml, userImages);
        replacedInSection += replaced.replacedCount;
        return replaced.html;
      }
    );

    if (replacedInSection > 0) {
      return { html: sectionAdjusted, replacedCount: replacedInSection };
    }
  }

  if (/(profile|avatar|hero|about\s+me|about\s+section)/i.test(prompt)) {
    const preferredImage = userImages[0];

    if (preferredImage?.fileName) {
      let replacedInSection = 0;
      const sectionAdjusted = html.replace(
        /<section\b[^>]*>[\s\S]*?<\/section>/gi,
        (sectionHtml) => {
          if (!/(hero|about|profile|avatar)/i.test(sectionHtml)) {
            return sectionHtml;
          }

          const replaced = sectionHtml.replace(/<img\b[^>]*>/i, (imgTag) => {
            if (!/\bsrc=(['"]).*?\1/i.test(imgTag)) {
              return imgTag;
            }

            replacedInSection += 1;
            return imgTag.replace(/\bsrc=(['"]).*?\1/i, `src="${preferredImage.fileName}"`);
          });

          return replaced;
        }
      );

      if (replacedInSection > 0) {
        return { html: sectionAdjusted, replacedCount: replacedInSection };
      }
    }
  }

  return replaceImgSrcSequentially(html, userImages);
}

function injectUploadedImagesForPreview(
  html: string,
  userImages: Array<{ fileName: string; dataUri: string }>
): string {
  let nextHtml = html;

  for (const image of userImages) {
    const variants = [
      image.fileName,
      `./${image.fileName}`,
      `/${image.fileName}`,
    ];

    for (const variant of variants) {
      const escapedVariant = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      nextHtml = nextHtml.replace(
        new RegExp(`src=["']${escapedVariant}["']`, "gi"),
        `src="${image.dataUri}"`
      );
    }
  }

  return nextHtml;
}

async function checkUserTokenBudget(
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

  if (genError) return { allowed: true };

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
 * POST /api/chat/send
 *
 * Saves a user message to the database and returns the updated
 * message list. AI generation will be added in weeks 2–3.
 *
 * Request body: { chatId: string, content: string }
 * Response:     { userMessage: HistoryMessage, messages: HistoryMessage[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chatId, content, language, skipUserMessageSave, imageFileIds } = body;
    const shouldSkipUserMessageSave = skipUserMessageSave === true;
    const selectedImageFileIds = Array.isArray(imageFileIds)
      ? Array.from(
          new Set(
            imageFileIds
              .filter((value): value is string => typeof value === "string")
              .map((value) => value.trim())
              .filter(Boolean)
          )
        )
      : [];

    // Validate input
    if (!chatId || typeof chatId !== "string") {
      return NextResponse.json(
        { error: "chatId is required." },
        { status: 400 }
      );
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "content is required." },
        { status: 400 }
      );
    }

    if (content.trim().length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: "Prompt too long." },
        { status: 400 }
      );
    }

    // Create authenticated Supabase client from request cookies
    const supabaseResponse = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              supabaseResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Verify auth and chat ownership in parallel
    const [user, { data: chat, error: chatError }] = await Promise.all([
      getCurrentUser(supabase),
      supabase.from("chats").select("id").eq("id", chatId).single(),
    ]);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    if (chatError || !chat) {
      return NextResponse.json(
        { error: "Chat not found." },
        { status: 404 }
      );
    }

    const budget = await checkUserTokenBudget(supabase, user.id);
    if (!budget.allowed) {
      return NextResponse.json(
        { error: budget.reason ?? "Daily token limit reached. Try again tomorrow." },
        { status: 429 }
      );
    }

    let userMessage = null;

    if (!shouldSkipUserMessageSave) {
      userMessage = await addMessage(
        supabase,
        chatId,
        "user",
        content.trim()
      );
    }

    // Fetch history including the latest user message.
    let historyForAI = await getChatMessages(supabase, chatId);

    if (shouldSkipUserMessageSave) {
      userMessage = [...historyForAI]
        .reverse()
        .find((message) => message.role === "user") ?? null;

      if (!userMessage) {
        userMessage = await addMessage(
          supabase,
          chatId,
          "user",
          content.trim()
        );
        historyForAI = await getChatMessages(supabase, chatId);
      }
    }

    if (!userMessage) {
      throw new Error("Unable to resolve user message for this request.");
    }

    // Get website language and existing HTML for edit mode detection
    const existingWebsite = await getWebsiteByChatId(supabase, chatId);
    const effectiveLanguage: AppLanguage = isAppLanguage(language)
      ? language
      : existingWebsite?.language ?? "en";
    const existingHtml = existingWebsite
      ? await getGeneratedHtml(supabase, existingWebsite.id)
      : null;
    const existingHtmlForAI = normalizeExistingHtmlForPrompt(existingHtml);

    let userImages: Array<{ fileName: string; dataUri: string }> = [];
    let websiteImagePool: Array<{ fileName: string; dataUri: string }> = [];

    if (existingWebsite && selectedImageFileIds.length > 0) {
      try {
        const { data, error } = await supabase
          .from("files")
          .select("id, file_name, content")
          .eq("website_id", existingWebsite.id)
          .eq("is_user_upload", true)
          .in("id", selectedImageFileIds);

        if (error) {
          throw error;
        }

        const byId = new Map(
          (data ?? []).map((row) => [
            row.id,
            {
              fileName: row.file_name,
              dataUri: row.content,
            },
          ])
        );

        userImages = selectedImageFileIds
          .map((id) => byId.get(id))
          .filter(
            (
              value
            ): value is {
              fileName: string;
              dataUri: string;
            } => Boolean(value)
          );

        console.log(
          `[chat/send] User images found: ${userImages.length}`,
          userImages.map((img) => img.fileName)
        );
      } catch (error) {
        if (isMissingUploadColumns(error)) {
          userImages = [];
        } else {
          throw error;
        }
      }
    }

    if (existingWebsite) {
      try {
        const { data: allImagesData, error: allImagesError } = await supabase
          .from("files")
          .select("file_name, content")
          .eq("website_id", existingWebsite.id)
          .eq("is_user_upload", true)
          .order("created_at", { ascending: true });

        if (allImagesError) {
          throw allImagesError;
        }

        websiteImagePool = (allImagesData ?? []).map((row) => ({
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
    }

    if (websiteImagePool.length === 0 && userImages.length > 0) {
      websiteImagePool = userImages;
    }

    // Call DeepSeek AI — pass existingHtml so edit mode activates correctly
    const aiResponse = await generateAIResponse(
      supabase,
      chatId,
      historyForAI,
      effectiveLanguage,
      existingHtmlForAI,
      userImages
    );

    let htmlToSave: string | null = null;
    let htmlForPreview: string | undefined;

    const shouldForceUploadedImageSwap =
      promptRequestsUploadedImageSwap(content.trim()) && userImages.length > 0;

    if (aiResponse.type === "website") {
      let normalizedHtml = normalizeGeneratedHtmlForStorage(aiResponse.html, userImages);

      if (shouldForceUploadedImageSwap) {
        const referencedCount = countReferencedUserImagePaths(normalizedHtml, userImages);

        if (referencedCount === 0) {
          const baseHtmlForForcedSwap = existingHtml && existingHtml.trim().length > 0
            ? existingHtml
            : normalizedHtml;

          const forced = forceApplyUploadedImagesToHtml(
            baseHtmlForForcedSwap,
            userImages,
            content.trim()
          );

          if (forced.replacedCount > 0) {
            normalizedHtml = forced.html;
          }
        }
      }

      htmlToSave = normalizedHtml;
      htmlForPreview = injectUploadedImagesForPreview(normalizedHtml, websiteImagePool);
    } else if (existingWebsite && existingHtml && shouldForceUploadedImageSwap) {
      const forced = forceApplyUploadedImagesToHtml(existingHtml, userImages, content.trim());

      if (forced.replacedCount > 0) {
        htmlToSave = forced.html;
        htmlForPreview = injectUploadedImagesForPreview(forced.html, websiteImagePool);
      }
    }

    if (htmlToSave) {
      let website = existingWebsite;

      if (!website) {
        try {
          website = await createWebsite(
            supabase,
            chatId,
            content.trim(),
            effectiveLanguage
          );
        } catch (error) {
          const maybePgError = error as PostgresLikeError;

          if (maybePgError.code === "23505") {
            website = await getWebsiteByChatId(supabase, chatId);
          } else {
            throw error;
          }
        }
      }

      if (!website) {
        throw new Error("Failed to resolve website after creation race.");
      }

      if (website.language !== effectiveLanguage) {
        const { error: updateLanguageError } = await supabase
          .from("websites")
          .update({ language: effectiveLanguage })
          .eq("id", website.id);

        if (updateLanguageError) {
          throw updateLanguageError;
        }
      }

      await saveGeneratedHtml(supabase, website.id, htmlToSave);
    }

    // Save the assistant message (the text part)
    const assistantMessage = await addMessage(
      supabase,
      chatId,
      "assistant",
      aiResponse.message
    );

    // If this is the first user message, generate a short title
    const userMessages = historyForAI.filter((m) => m.role === "user");
    if (userMessages.length === 1) {
      try {
        const title = await generateChatTitle(content.trim(), effectiveLanguage);
        await renameChat(supabase, chatId, title);
      } catch {
        try {
          await renameChat(supabase, chatId, "New Website");
        } catch {
          // Keep request successful even if title updates fail.
        }
      }
    }

    // Fetch full message list so client has the latest state.
    const messages = await getChatMessages(supabase, chatId);

    return NextResponse.json({
      userMessage,
      assistantMessage,
      messages,
      aiResponseType: aiResponse.type,
      html:
        typeof htmlForPreview === "string"
          ? htmlForPreview
          : aiResponse.type === "website"
            ? aiResponse.html
            : undefined,
    });
  } catch (error) {
    console.error("POST /api/chat/send error:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
