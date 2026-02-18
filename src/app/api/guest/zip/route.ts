import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getCurrentUser } from "@/shared/services/user-service";

const ZIP_FILENAME = "website-files.zip";
const TEXT_FILENAME = "README.txt";

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const prompt =
      body &&
      typeof body === "object" &&
      "prompt" in body &&
      typeof body.prompt === "string"
        ? body.prompt.trim()
        : "";

    if (!prompt) {
      return NextResponse.json(
        { error: "prompt is required." },
        { status: 400 }
      );
    }

    const zip = new JSZip();
    const fileText = [
      "AI Website Builder - Starter Package",
      "",
      "This is a placeholder ZIP for testing download gating.",
      "",
      `Prompt: ${prompt}`,
      `Generated for user: ${user.email ?? user.id}`,
      `Generated at: ${new Date().toISOString()}`,
    ].join("\n");

    zip.file(TEXT_FILENAME, fileText);

    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${ZIP_FILENAME}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("POST /api/guest/zip error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
