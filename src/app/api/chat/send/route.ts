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
import type { AppLanguage } from "@/shared/types/database";

function isAppLanguage(value: unknown): value is AppLanguage {
  return value === "en" || value === "ar" || value === "ku";
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
    const { chatId, content, language } = body;

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

    // Save user message to DB
    const userMessage = await addMessage(
      supabase,
      chatId,
      "user",
      content.trim()
    );

    // Fetch history including the just-saved user message
    const historyForAI = await getChatMessages(supabase, chatId);

    // Get website language and existing HTML for edit mode detection
    const existingWebsite = await getWebsiteByChatId(supabase, chatId);
    const effectiveLanguage: AppLanguage = isAppLanguage(language)
      ? language
      : existingWebsite?.language ?? "en";
    const existingHtml = existingWebsite
      ? await getGeneratedHtml(supabase, existingWebsite.id)
      : null;

    // Call OpenRouter AI — pass existingHtml so edit mode activates correctly
    const aiResponse = await generateAIResponse(
      supabase,
      chatId,
      historyForAI,
      effectiveLanguage,
      existingHtml
    );

    // If AI generated a website, save the HTML
    if (aiResponse.type === "website") {
      let website = existingWebsite;
      if (!website) {
        website = await createWebsite(
          supabase,
          chatId,
          content.trim(),
          effectiveLanguage
        );
      } else if (website.language !== effectiveLanguage) {
        const { error: updateLanguageError } = await supabase
          .from("websites")
          .update({ language: effectiveLanguage })
          .eq("id", website.id);

        if (updateLanguageError) {
          throw updateLanguageError;
        }
      }
      await saveGeneratedHtml(supabase, website.id, aiResponse.html);
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
      const title = await generateChatTitle(content.trim(), effectiveLanguage);
      await renameChat(supabase, chatId, title);
    }

    // Fetch full message list so client has the latest state.
    const messages = await getChatMessages(supabase, chatId);

    return NextResponse.json({
      userMessage,
      assistantMessage,
      messages,
      aiResponseType: aiResponse.type,
      html: aiResponse.type === "website" ? aiResponse.html : undefined,
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
