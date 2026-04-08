import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getCurrentUser } from "@/shared/services/user-service";
import {
  getWebsiteByChatId,
  createWebsite,
  saveGeneratedHtml,
} from "@/server/services/website-service";
import type { AppLanguage } from "@/shared/types/database";

type PostgresLikeError = {
  code?: string;
};

function isAppLanguage(value: unknown): value is AppLanguage {
  return value === "en" || value === "ar" || value === "ku";
}

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
    const preferredLanguage: AppLanguage =
      body &&
      typeof body === "object" &&
      "language" in body &&
      isAppLanguage(body.language)
        ? body.language
        : "en";
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
      .select("id, title")
      .eq("id", chatId)
      .eq("user_id", user.id)
      .single();

    if (chatLookupError || !ownedChat) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    let website = await getWebsiteByChatId(supabase, chatId);

    if (!website) {
      const { data: firstUserMessage } = await supabase
        .from("history")
        .select("content")
        .eq("chat_id", chatId)
        .eq("role", "user")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const firstUserPrompt =
        typeof firstUserMessage?.content === "string"
          ? firstUserMessage.content.trim()
          : "";

      const fallbackPrompt =
        firstUserPrompt || ownedChat.title?.trim() || "Imported guest website";

      try {
        website = await createWebsite(
          supabase,
          chatId,
          fallbackPrompt,
          preferredLanguage
        );
      } catch (error) {
        const maybePgError = error as PostgresLikeError;

        if (maybePgError.code === "23505") {
          website = await getWebsiteByChatId(supabase, chatId);
        } else {
          throw error;
        }
      }

      if (!website) {
        return NextResponse.json(
          { error: "Failed to create website record." },
          { status: 500 }
        );
      }
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
