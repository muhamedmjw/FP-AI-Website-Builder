import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getCurrentUser } from "@/shared/services/user-service";

type VersionLabelRequestBody = {
  versionId: string;
  label: string;
  chatId: string;
};

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | Partial<VersionLabelRequestBody>
      | null;

    const versionId =
      body && typeof body.versionId === "string" ? body.versionId.trim() : "";
    const chatId = body && typeof body.chatId === "string" ? body.chatId.trim() : "";
    const rawLabel = body && typeof body.label === "string" ? body.label : null;

    if (!versionId || !chatId) {
      return NextResponse.json(
        { error: "versionId and chatId are required." },
        { status: 400 }
      );
    }

    if (typeof rawLabel !== "string") {
      return NextResponse.json({ error: "label must be a string." }, { status: 400 });
    }

    const trimmedLabel = rawLabel.trim();

    if (!trimmedLabel) {
      return NextResponse.json(
        { error: "label cannot be empty." },
        { status: 400 }
      );
    }

    if (trimmedLabel.length > 60) {
      return NextResponse.json(
        { error: "label must be between 1 and 60 characters." },
        { status: 400 }
      );
    }

    const { data: versionRow, error: versionLookupError } = await supabase
      .from("file_versions")
      .select("id, website_id")
      .eq("id", versionId)
      .maybeSingle();

    if (versionLookupError) {
      throw versionLookupError;
    }

    if (!versionRow) {
      return NextResponse.json({ error: "Version not found." }, { status: 404 });
    }

    const { data: ownedWebsite, error: ownedWebsiteError } = await supabase
      .from("websites")
      .select("id, chat_id, chats!inner(user_id)")
      .eq("id", versionRow.website_id)
      .eq("chat_id", chatId)
      .eq("chats.user_id", user.id)
      .maybeSingle();

    if (ownedWebsiteError) {
      throw ownedWebsiteError;
    }

    if (!ownedWebsite) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { error: updateError } = await supabase
      .from("file_versions")
      .update({ label: trimmedLabel })
      .eq("id", versionId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, label: trimmedLabel });
  } catch (error) {
    console.error("PATCH /api/website/version-label error:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
