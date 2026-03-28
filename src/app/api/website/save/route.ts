import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getCurrentUser } from "@/shared/services/user-service";
import {
  getWebsiteByChatId,
  saveGeneratedHtml,
} from "@/server/services/website-service";

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const chatId =
      body &&
      typeof body === "object" &&
      "chatId" in body &&
      typeof body.chatId === "string"
        ? body.chatId.trim()
        : "";
    const rawHtml =
      body &&
      typeof body === "object" &&
      "html" in body &&
      typeof body.html === "string"
        ? body.html
        : "";
    const trimmedHtml = rawHtml.trim();

    if (!chatId || !trimmedHtml || trimmedHtml.length < 100) {
      return NextResponse.json(
        {
          error:
            "chatId is required and html must be a non-empty string with at least 100 characters.",
        },
        { status: 400 }
      );
    }

    const { data: ownedChat, error: chatLookupError } = await supabase
      .from("chats")
      .select("id")
      .eq("id", chatId)
      .eq("user_id", user.id)
      .single();

    if (chatLookupError || !ownedChat) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const website = await getWebsiteByChatId(supabase, chatId);

    if (!website) {
      return NextResponse.json({ error: "Website not found." }, { status: 404 });
    }

    await saveGeneratedHtml(supabase, website.id, rawHtml);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/website/save error:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
