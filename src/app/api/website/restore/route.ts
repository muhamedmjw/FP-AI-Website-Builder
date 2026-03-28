import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getCurrentUser } from "@/shared/services/user-service";
import {
  getWebsiteByChatId,
  restoreFileVersion,
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
    const versionId =
      body &&
      typeof body === "object" &&
      "versionId" in body &&
      typeof body.versionId === "string"
        ? body.versionId.trim()
        : "";

    if (!chatId || !versionId) {
      return NextResponse.json(
        { error: "chatId and versionId are required." },
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

    const restoredFile = await restoreFileVersion(supabase, website.id, versionId);

    return NextResponse.json({
      html: restoredFile.content,
      version: restoredFile.version,
    });
  } catch (error) {
    console.error("POST /api/website/restore error:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
