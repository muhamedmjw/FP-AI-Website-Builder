import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { addMessage, getChatMessages } from "@/shared/services/chat-service";
import { getCurrentUser } from "@/shared/services/user-service";
import { generateAIResponse, generateChatTitle, GenerationCancelledError } from "@/server/services/ai-service";
import { renameChat } from "@/shared/services/chat-service";
import { getWebsiteByChatId, getGeneratedHtml } from "@/server/services/website-service";
import { MAX_PROMPT_LENGTH } from "@/shared/constants/limits";
import type { AppLanguage, HistoryMessage } from "@/shared/types/database";
import { extractBooleanField, extractStringArrayField, extractStringField } from "@/shared/utils/request-helpers";
import { t } from "@/shared/constants/translations";
import { getSupabaseRouteClient } from "@/server/supabase/server-client";
import {
  checkUserTokenBudget,
  handleHtmlGeneration,
  resolveUserImages,
  saveWebsiteRecord,
} from "@/server/services/chat-send-service";
import { applyEditPatches } from "@/server/services/html-patch";
import { checkEthicalCompliance } from "@/server/services/ethics-service";
import { detectPromptLanguage } from "@/shared/utils/language-detection";
// Allow up to 60s for AI generation on Vercel (default is 10s which is too short).
export const maxDuration = 60;

const MAX_EXISTING_HTML_PROMPT_CHARS = 140_000;

function isAppLanguage(value: unknown): value is AppLanguage {
  return value === "en" || value === "ar" || value === "ku";
}

function normalizeExistingHtmlForPrompt(html: string | null): string | null {
  if (!html) {
    return null;
  }

  const normalized = html.replace(
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

type ValidatedSendRequest = {
  chatId: string;
  content: string;
  language: unknown;
  shouldSkipUserMessageSave: boolean;
  selectedImageFileIds: string[];
};

function validateRequest(body: unknown): {
  data?: ValidatedSendRequest;
  errorResponse?: NextResponse;
} {
  if (!body || typeof body !== "object") {
    return {
      errorResponse: NextResponse.json({ error: "Invalid request body." }, { status: 400 }),
    };
  }

  const chatId = extractStringField(body, "chatId") ?? "";
  const content = extractStringField(body, "content") ?? "";

  if (!chatId) {
    return {
      errorResponse: NextResponse.json({ error: "chatId is required." }, { status: 400 }),
    };
  }

  if (!content || content.trim().length === 0) {
    return {
      errorResponse: NextResponse.json({ error: "content is required." }, { status: 400 }),
    };
  }

  if (content.trim().length > MAX_PROMPT_LENGTH) {
    return {
      errorResponse: NextResponse.json({ error: "Prompt too long." }, { status: 400 }),
    };
  }

  const selectedImageFileIds = extractStringArrayField(body, "imageFileIds");

  return {
    data: {
      chatId,
      content,
      language: (body as Record<string, unknown>).language,
      shouldSkipUserMessageSave:
        extractBooleanField(body, "skipUserMessageSave") === true,
      selectedImageFileIds,
    },
  };
}

async function resolveUserMessageAndHistory(params: {
  supabase: SupabaseClient;
  chatId: string;
  content: string;
  shouldSkipUserMessageSave: boolean;
  selectedImageFileIds?: string[];
}): Promise<{ userMessage: HistoryMessage; historyForAI: HistoryMessage[] }> {
  const { supabase, chatId, content, shouldSkipUserMessageSave, selectedImageFileIds } = params;

  let userMessage: HistoryMessage | null = null;

  if (!shouldSkipUserMessageSave) {
    userMessage = await addMessage(supabase, chatId, "user", content, selectedImageFileIds);
  }

  let historyForAI = await getChatMessages(supabase, chatId);

  if (shouldSkipUserMessageSave) {
    userMessage = [...historyForAI]
      .reverse()
      .find((message) => message.role === "user") ?? null;

    if (!userMessage) {
      userMessage = await addMessage(supabase, chatId, "user", content, selectedImageFileIds);
      historyForAI = await getChatMessages(supabase, chatId);
    }
  }

  if (!userMessage) {
    throw new Error("Unable to resolve user message for this request.");
  }

  return { userMessage, historyForAI };
}

async function maybeRenameNewChat(
  supabase: SupabaseClient,
  chatId: string,
  historyForAI: HistoryMessage[],
  userPrompt: string,
  language: AppLanguage
): Promise<void> {
  const userMessages = historyForAI.filter((message) => message.role === "user");
  if (userMessages.length !== 1) {
    return;
  }

  try {
    const title = await generateChatTitle(userPrompt, language);
    await renameChat(supabase, chatId, title);
  } catch {
    const fallbackTitles: Record<string, string> = {
      en: "New Chat",
      ar: "محادثة جديدة",
      ku: "چاتی نوێ",
    };
    try {
      await renameChat(supabase, chatId, fallbackTitles[language] ?? fallbackTitles.en);
    } catch {
      // Keep request successful even if title updates fail.
    }
  }
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
    // Validate request payload.
    const body = await request.json();
    const validation = validateRequest(body);
    if (validation.errorResponse) {
      return validation.errorResponse;
    }

    const sendRequest = validation.data as ValidatedSendRequest;
    const trimmedContent = sendRequest.content.trim();

    // Create authenticated Supabase client.
    const { supabase } = getSupabaseRouteClient(request);

    // Verify authenticated user.
    const user = await getCurrentUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Verify chat ownership.
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("id, is_locked, age_verified")
      .eq("id", sendRequest.chatId)
      .eq("user_id", user.id)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: "Chat not found." }, { status: 404 });
    }

    if (chat.is_locked) {
      const messages = await getChatMessages(supabase, sendRequest.chatId);
      return NextResponse.json({ messages, aiResponseType: "locked" });
    }

    // Enforce daily token budget.
    const budget = await checkUserTokenBudget(supabase, user.id);
    if (!budget.allowed) {
      return NextResponse.json(
        { error: budget.reason ?? "Daily token limit reached. Try again tomorrow." },
        { status: 429 }
      );
    }
      
    // Detect language of the actual prompt for the AI's internal response
    const promptLanguage = detectPromptLanguage(trimmedContent);

    // Run ethical checks BEFORE saving the user's message for age verification to avoid dirty state
    const ethicalStatus = await checkEthicalCompliance(trimmedContent);

    // Resolve user message and full history context first so we can save it for age verification if needed
    const { userMessage, historyForAI } = await resolveUserMessageAndHistory({
      supabase,
      chatId: sendRequest.chatId,
      content: trimmedContent,
      shouldSkipUserMessageSave: sendRequest.shouldSkipUserMessageSave,
      selectedImageFileIds: sendRequest.selectedImageFileIds,
    });

    if (ethicalStatus === "age_verification" && !chat.age_verified) {
      // Mark the chat as needing age verification
      await supabase.from("chats").update({ needs_age_verification: true }).eq("id", sendRequest.chatId);
      const assistantMessage = await addMessage(
        supabase,
        sendRequest.chatId,
        "assistant",
        t("ageVerificationAssistantMessage", promptLanguage)
      );
      
      return NextResponse.json({
        aiResponseType: "age_verification_required",
        assistantMessage: {
          id: assistantMessage.id,
          role: "assistant",
          content: assistantMessage.content,
        },
      });
    }

    if (ethicalStatus === "lock") {
      // Permanently lock the chat
      await supabase.from("chats").update({ is_locked: true }).eq("id", sendRequest.chatId);
      const assistantMessage = await addMessage(
        supabase,
        sendRequest.chatId,
        "assistant",
        t("chatLockedAssistantMessage", promptLanguage)
      );
      const messages = await getChatMessages(supabase, sendRequest.chatId);
      return NextResponse.json({ messages, userMessage, assistantMessage, aiResponseType: "locked" });
    }

    // Load website context and selected images.
    const existingWebsite = await getWebsiteByChatId(supabase, sendRequest.chatId);
    const effectiveLanguage = isAppLanguage(sendRequest.language)
      ? sendRequest.language
      : (existingWebsite?.language ?? "en");

    const existingHtml = existingWebsite
      ? await getGeneratedHtml(supabase, existingWebsite.id)
      : null;

    const { userImages, websiteImagePool } = await resolveUserImages(
      supabase,
      existingWebsite?.id ?? null,
      sendRequest.selectedImageFileIds
    );

    // Generate AI response for the current chat.
    let aiResponse = await generateAIResponse(
      supabase,
      sendRequest.chatId,
      historyForAI,
      effectiveLanguage,
      normalizeExistingHtmlForPrompt(existingHtml),
      userImages
    );

    // Handle patch-based edits: apply search/replace patches to the original HTML.
    if (aiResponse.type === "website_edit" && existingHtml) {
      const patchResult = applyEditPatches(existingHtml, aiResponse.changes);

      if (patchResult.appliedCount > 0) {
        aiResponse = {
          type: "website",
          html: patchResult.html,
          message: aiResponse.message,
        };
      } else {
        // All patches failed — treat as a conversational response so we don't break the site.
        console.warn(
          "All edit patches failed to apply:",
          patchResult.failedPatches
        );
        aiResponse = {
          type: "questions",
          message:
            aiResponse.message +
            "\n\n(The edit could not be applied automatically. Please try rephrasing your request.)",
        };
      }
    }

    // Transform and persist generated HTML output.
    const { htmlToSave, htmlForPreview } = handleHtmlGeneration({
      aiResponse,
      existingWebsiteId: existingWebsite?.id ?? null,
      existingHtml,
      content: trimmedContent,
      userImages,
      websiteImagePool,
    });

    await saveWebsiteRecord({
      supabase,
      chatId: sendRequest.chatId,
      businessPrompt: trimmedContent,
      language: effectiveLanguage,
      existingWebsite,
      htmlToSave,
    });

    // Save assistant message and update title for brand-new chats.
    const assistantMessage = await addMessage(
      supabase,
      sendRequest.chatId,
      "assistant",
      aiResponse.message
    );

    await maybeRenameNewChat(
      supabase,
      sendRequest.chatId,
      historyForAI,
      trimmedContent,
      effectiveLanguage
    );

    // Assemble and return response payload.
    const messages = await getChatMessages(supabase, sendRequest.chatId);
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
    // Handle generation cancellation
    if (error instanceof GenerationCancelledError) {
      return NextResponse.json(
        { error: "Generation cancelled by user.", cancelled: true },
        { status: 499 } // 499 Client Closed Request
      );
    }

    console.error("POST /api/chat/send error:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
