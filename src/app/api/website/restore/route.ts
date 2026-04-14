import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getCurrentUser } from "@/shared/services/user-service";
import {
  getWebsiteByChatId,
  restoreFileVersion,
} from "@/server/services/website-service";
import { isMissingUploadColumns } from "@/shared/utils/db-guards";
import { injectUploadedImagesForPreview } from "@/shared/utils/html-images";

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

    // Inject uploaded image data so the preview renders correctly.
    // Without this, restored HTML contains bare filenames (e.g. src="photo.png")
    // that the iframe cannot resolve — causing broken images.
    let htmlForPreview = restoredFile.content;

    try {
      const { data: uploadedImages, error: uploadedImagesError } = await supabase
        .from("files")
        .select("file_name, content")
        .eq("website_id", website.id)
        .eq("is_user_upload", true)
        .order("created_at", { ascending: true });

      if (uploadedImagesError) {
        if (!isMissingUploadColumns(uploadedImagesError)) {
          console.error("Failed to load uploaded images for restore:", uploadedImagesError);
        }
      } else if (uploadedImages && uploadedImages.length > 0) {
        htmlForPreview = injectUploadedImagesForPreview(
          restoredFile.content,
          uploadedImages.map((img) => ({
            fileName: img.file_name,
            dataUri: img.content,
          }))
        );
      }
    } catch (imgError) {
      console.error("Failed to inject images into restored version:", imgError);
    }

    return NextResponse.json({
      html: htmlForPreview,
      version: restoredFile.version,
    });
  } catch (error) {
    console.error("POST /api/website/restore error:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
