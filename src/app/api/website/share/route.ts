import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getCurrentUser } from "@/shared/services/user-service";
import {
  getWebsiteByChatId,
  setWebsitePublic,
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
    const isPublic =
      body &&
      typeof body === "object" &&
      "isPublic" in body &&
      typeof body.isPublic === "boolean"
        ? body.isPublic
        : null;

    if (!chatId || isPublic === null) {
      return NextResponse.json(
        { error: "chatId and isPublic are required." },
        { status: 400 }
      );
    }

    const website = await getWebsiteByChatId(supabase, chatId);

    if (!website) {
      return NextResponse.json(
        { error: "Website not found." },
        { status: 404 }
      );
    }

    await setWebsitePublic(supabase, website.id, isPublic);

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin).replace(
      /\/$/,
      ""
    );
    const shareUrl = `${appUrl}/preview/${chatId}`;

    return NextResponse.json({ shareUrl });
  } catch (error) {
    console.error("POST /api/website/share error:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
