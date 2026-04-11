import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { addMessage, getChatMessages } from "@/shared/services/chat-service";
import { getCurrentUser } from "@/shared/services/user-service";
import { generateAIResponse, generateChatTitle, GenerationCancelledError } from "@/server/services/ai-service";
import { renameChat } from "@/shared/services/chat-service";
import { getWebsiteByChatId, getGeneratedHtml, saveWebsiteRecord } from "@/server/services/website-service";
import { AI_CONFIG } from "@/shared/constants/ai";
import { MAX_PROMPT_LENGTH } from "@/shared/constants/limits";
import type { AppLanguage, HistoryMessage } from "@/shared/types/database";
import { extractBooleanField, extractStringArrayField, extractStringField } from "@/shared/utils/request-helpers";
import { resolveUserImages } from "@/shared/utils/user-images";
import { handleHtmlGeneration } from "@/app/api/chat/send/handle-html-generation";
import { getSupabaseRouteClient } from "@/server/supabase/server-client";

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

function createAuthenticatedSupabaseClient(request: NextRequest): SupabaseClient {
  const { supabase } = getSupabaseRouteClient(request);
  return supabase;
}

async function authorizeUserAndChat(
  supabase: SupabaseClient,
  chatId: string
): Promise<{ userId: string } | NextResponse> {
  const [user, { data: chat, error: chatError }] = await Promise.all([
    getCurrentUser(supabase),
    supabase.from("chats").select("id").eq("id", chatId).single(),
  ]);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (chatError || !chat) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }

  return { userId: user.id };
}

async function resolveUserMessageAndHistory(params: {
  supabase: SupabaseClient;
  chatId: string;
  content: string;
  shouldSkipUserMessageSave: boolean;
}): Promise<{ userMessage: HistoryMessage; historyForAI: HistoryMessage[] }> {
  const { supabase, chatId, content, shouldSkipUserMessageSave } = params;

  let userMessage: HistoryMessage | null = null;

  if (!shouldSkipUserMessageSave) {
    userMessage = await addMessage(supabase, chatId, "user", content);
  }

  let historyForAI = await getChatMessages(supabase, chatId);

  if (shouldSkipUserMessageSave) {
    userMessage = [...historyForAI]
      .reverse()
      .find((message) => message.role === "user") ?? null;

    if (!userMessage) {
      userMessage = await addMessage(supabase, chatId, "user", content);
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
    try {
      await renameChat(supabase, chatId, "New Website");
    } catch {
      // Keep request successful even if title updates fail.
    }
  }
}

async function runSendPipeline(
  request: NextRequest,
  sendRequest: ValidatedSendRequest
): Promise<NextResponse> {
  const trimmedContent = sendRequest.content.trim();

  const supabase = createAuthenticatedSupabaseClient(request);
  const accessResult = await authorizeUserAndChat(supabase, sendRequest.chatId);
  if (accessResult instanceof NextResponse) {
    return accessResult;
  }

  const budget = await checkUserTokenBudget(supabase, accessResult.userId);
  if (!budget.allowed) {
    return NextResponse.json(
      { error: budget.reason ?? "Daily token limit reached. Try again tomorrow." },
      { status: 429 }
    );
  }

  const { userMessage, historyForAI } = await resolveUserMessageAndHistory({
    supabase,
    chatId: sendRequest.chatId,
    content: trimmedContent,
    shouldSkipUserMessageSave: sendRequest.shouldSkipUserMessageSave,
  });

  const existingWebsite = await getWebsiteByChatId(supabase, sendRequest.chatId);
  const effectiveLanguage: AppLanguage = isAppLanguage(sendRequest.language)
    ? sendRequest.language
    : existingWebsite?.language ?? "en";
  const existingHtml = existingWebsite
    ? await getGeneratedHtml(supabase, existingWebsite.id)
    : null;

  const { userImages, websiteImagePool } = await resolveUserImages(
    supabase,
    existingWebsite?.id ?? null,
    sendRequest.selectedImageFileIds
  );

  const aiResponse = await generateAIResponse(
    supabase,
    sendRequest.chatId,
    historyForAI,
    effectiveLanguage,
    normalizeExistingHtmlForPrompt(existingHtml),
    userImages
  );

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
    const validation = validateRequest(body);
    if (validation.errorResponse) {
      return validation.errorResponse;
    }

    return runSendPipeline(request, validation.data as ValidatedSendRequest);
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
