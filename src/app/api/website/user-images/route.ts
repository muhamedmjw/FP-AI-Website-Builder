import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getWebsiteByChatId } from "@/server/services/website-service";
import { getCurrentUser } from "@/shared/services/user-service";
import type { UserImage } from "@/shared/types/database";

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function isMissingUploadColumns(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const supabaseError = error as SupabaseLikeError;
  const combinedMessage = [
    supabaseError.message,
    supabaseError.details,
    supabaseError.hint,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return (
    supabaseError.code === "42703" ||
    (combinedMessage.includes("is_user_upload") && combinedMessage.includes("column")) ||
    (combinedMessage.includes("mime_type") && combinedMessage.includes("column"))
  );
}

function inferMimeType(dataUri: string, fallback = "image/*"): string {
  const match = dataUri.match(/^data:([^;,]+)[;,]/i);
  return match?.[1]?.trim() || fallback;
}

async function userOwnsChat(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  userId: string,
  chatId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("chats")
    .select("id")
    .eq("id", chatId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const chatId = request.nextUrl.searchParams.get("chatId")?.trim() ?? "";

    if (!chatId) {
      return NextResponse.json({ error: "chatId is required." }, { status: 400 });
    }

    const ownsChat = await userOwnsChat(supabase, user.id, chatId);
    if (!ownsChat) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const website = await getWebsiteByChatId(supabase, chatId);

    if (!website) {
      return NextResponse.json({ images: [] });
    }

    const { data, error } = await supabase
      .from("files")
      .select("id, file_name, content, mime_type")
      .eq("website_id", website.id)
      .eq("is_user_upload", true)
      .order("created_at", { ascending: true });

    if (error) {
      if (isMissingUploadColumns(error)) {
        return NextResponse.json({ images: [] });
      }

      throw error;
    }

    const images: UserImage[] = (data ?? []).map((row) => ({
      fileId: row.id,
      fileName: row.file_name,
      dataUri: row.content,
      mimeType: row.mime_type ?? inferMimeType(row.content),
    }));

    return NextResponse.json({ images });
  } catch (error) {
    console.error("GET /api/website/user-images error:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
