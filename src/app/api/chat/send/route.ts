import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { addMessage, getChatMessages } from "@/lib/services/chat-service";

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

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    // Verify the chat exists and belongs to the user (RLS enforces this)
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("id")
      .eq("id", chatId)
      .single();

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

    // TODO (Week 2): Send conversation to AI, get response, save assistant
    // message and generated HTML. For now, save a placeholder assistant reply.
    const assistantMessage = await addMessage(
      supabase,
      chatId,
      "assistant",
      "Thanks! AI generation will be connected soon. You said: " + content.trim()
    );

    // Fetch full message list so client has the latest state
    const messages = await getChatMessages(supabase, chatId);

    return NextResponse.json({
      userMessage,
      assistantMessage,
      messages,
    });
  } catch (error) {
    console.error("POST /api/chat/send error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
