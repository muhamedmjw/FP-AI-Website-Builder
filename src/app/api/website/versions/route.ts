import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getCurrentUser } from "@/shared/services/user-service";
import {
  getFileVersions,
  getWebsiteByChatId,
} from "@/server/services/website-service";

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

    const website = await getWebsiteByChatId(supabase, chatId);

    if (!website) {
      return NextResponse.json(
        { error: "Website not found." },
        { status: 404 }
      );
    }

    const versions = await getFileVersions(supabase, website.id);
    const { data: currentFile, error: currentFileError } = await supabase
      .from("files")
      .select("id, version")
      .eq("website_id", website.id)
      .eq("file_name", "index.html")
      .maybeSingle();

    if (currentFileError) {
      throw currentFileError;
    }

    return NextResponse.json({
      versions,
      currentVersion: currentFile?.version ?? null,
    });
  } catch (error) {
    console.error("GET /api/website/versions error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
