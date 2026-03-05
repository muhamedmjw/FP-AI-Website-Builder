import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { addMessage, getChatMessages } from "@/shared/services/chat-service";
import { getCurrentUser } from "@/shared/services/user-service";
import { generateAIResponse, generateChatTitle } from "@/server/services/ai-service";
import { renameChat } from "@/shared/services/chat-service";
import {
  getWebsiteByChatId,
  createWebsite,
  saveGeneratedHtml,
} from "@/server/services/website-service";

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
    const { chatId, content } = body;

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

    // Save user message to DB
    const userMessage = await addMessage(
      supabase,
      chatId,
      "user",
      content.trim()
    );

    // Fetch history including the just-saved user message
    const historyForAI = await getChatMessages(supabase, chatId);

    // Get website language (default to 'en')
    const existingWebsite = await getWebsiteByChatId(supabase, chatId);
    const language = existingWebsite?.language ?? "en";

    // Call Gemini AI
    const aiResponse = await generateAIResponse(
      supabase,
      chatId,
      historyForAI,
      language
    );

    // If AI generated a website, save the HTML
    if (aiResponse.type === "website") {
      let website = existingWebsite;
      if (!website) {
        website = await createWebsite(
          supabase,
          chatId,
          content.trim(),
          language
        );
      }
      await saveGeneratedHtml(supabase, website.id, aiResponse.html);
    }

    // Save the assistant message (the text part)
    const assistantContent =
      aiResponse.type === "website"
        ? aiResponse.message
        : aiResponse.message;

    const assistantMessage = await addMessage(
      supabase,
      chatId,
      "assistant",
      assistantContent
    );

    // If this is the first user message, generate a short title
    const userMessages = historyForAI.filter((m) => m.role === "user");
    if (userMessages.length === 1) {
      const title = await generateChatTitle(content.trim());
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
