import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getCurrentUser } from "@/shared/services/user-service";
import { abortGeneration } from "@/server/services/generation-manager";

/**
 * POST /api/chat/abort
 *
 * Abort an active AI generation for a chat.
 *
 * Request body: { chatId: string }
 * Response: { success: boolean, wasActive: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const chatId =
      body &&
      typeof body === "object" &&
      "chatId" in body &&
      typeof body.chatId === "string"
        ? body.chatId.trim()
        : "";

    if (!chatId) {
      return NextResponse.json(
        { error: "chatId is required." },
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

    // Verify auth
    const user = await getCurrentUser(supabase);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    // Verify chat ownership
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("id")
      .eq("id", chatId)
      .eq("user_id", user.id)
      .single();

    if (chatError || !chat) {
      return NextResponse.json(
        { error: "Chat not found." },
        { status: 404 }
      );
    }

    // Abort the generation
    const wasActive = abortGeneration(chatId);

    return NextResponse.json({
      success: true,
      wasActive,
    });
  } catch (error) {
    console.error("POST /api/chat/abort error:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
