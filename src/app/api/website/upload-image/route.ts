// NOTE: Image upload feature disabled - do not delete, will be re-enabled later.
import { Buffer } from "node:buffer";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import {
  createWebsite,
  getWebsiteByChatId,
} from "@/server/services/website-service";
import { getCurrentUser } from "@/shared/services/user-service";

type PostgresLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;
const IMAGE_MIME_TYPE_REGEX = /^image\//i;

function isMissingUploadColumns(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const pgError = error as PostgresLikeError;
  const combinedMessage = [pgError.message, pgError.details, pgError.hint]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return (
    pgError.code === "42703" ||
    (combinedMessage.includes("is_user_upload") && combinedMessage.includes("column")) ||
    (combinedMessage.includes("mime_type") && combinedMessage.includes("column"))
  );
}

function getExtensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    case "image/avif":
      return "avif";
    case "image/bmp":
      return "bmp";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    case "image/tiff":
      return "tiff";
    default:
      return "png";
  }
}

function getExtensionFromFileName(fileName: string): string | null {
  const parts = fileName.trim().split(".");
  if (parts.length < 2) {
    return null;
  }

  const candidate = parts.at(-1)?.toLowerCase() ?? "";
  if (!candidate || !/^[a-z0-9]{2,8}$/i.test(candidate)) {
    return null;
  }

  return candidate;
}

function resolveImageExtension(file: File, mimeType: string): string {
  const fromName = getExtensionFromFileName(file.name);
  if (fromName) {
    return fromName;
  }

  return getExtensionFromMimeType(mimeType);
}

async function assertChatOwnership(
  userId: string,
  chatId: string,
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const chatIdValue = formData.get("chatId");
    const fileValue = formData.get("file");

    const chatId = typeof chatIdValue === "string" ? chatIdValue.trim() : "";

    if (!chatId) {
      return NextResponse.json({ error: "chatId is required." }, { status: 400 });
    }

    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: "file is required." }, { status: 400 });
    }

    const mimeType = fileValue.type.trim().toLowerCase();

    if (!IMAGE_MIME_TYPE_REGEX.test(mimeType)) {
      return NextResponse.json(
        { error: "Only image uploads are allowed." },
        { status: 400 }
      );
    }

    if (fileValue.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image size must be 4 MB or less." },
        { status: 400 }
      );
    }

    const ownsChat = await assertChatOwnership(user.id, chatId, supabase);
    if (!ownsChat) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const arrayBuffer = await fileValue.arrayBuffer();
    const binaryBuffer = Buffer.from(arrayBuffer);
    const base64 = binaryBuffer.toString("base64");
    const dataUri = `data:${mimeType};base64,${base64}`;

    let website = await getWebsiteByChatId(supabase, chatId);
    if (!website) {
      try {
        website = await createWebsite(supabase, chatId, "");
      } catch (error) {
        const maybePgError = error as PostgresLikeError;
        if (maybePgError.code === "23505") {
          website = await getWebsiteByChatId(supabase, chatId);
        } else {
          throw error;
        }
      }
    }

    if (!website) {
      throw new Error("Failed to load website for image upload.");
    }

    const extension = resolveImageExtension(fileValue, mimeType);
    const fileName = `assets/images/${crypto.randomUUID()}.${extension}`;

    const { data: fileRow, error: insertError } = await supabase
      .from("files")
      .insert({
        website_id: website.id,
        file_name: fileName,
        content: dataUri,
        version: 1,
        mime_type: mimeType,
        is_user_upload: true,
      })
      .select("id, file_name, content")
      .single();

    if (insertError) {
      if (isMissingUploadColumns(insertError)) {
        return NextResponse.json(
          {
            error:
              "Database migration required: add mime_type and is_user_upload columns to public.files.",
          },
          { status: 400 }
        );
      }

      throw insertError;
    }

    return NextResponse.json({
      fileId: fileRow.id,
      fileName: fileRow.file_name,
      dataUri: fileRow.content,
    });
  } catch (error) {
    console.error("POST /api/website/upload-image error:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const fileId = request.nextUrl.searchParams.get("fileId")?.trim() ?? "";

    if (!fileId) {
      return NextResponse.json({ error: "fileId is required." }, { status: 400 });
    }

    const { data: fileRow, error: fileError } = await supabase
      .from("files")
      .select("id, website_id, is_user_upload")
      .eq("id", fileId)
      .maybeSingle();

    if (fileError) {
      if (isMissingUploadColumns(fileError)) {
        return NextResponse.json(
          {
            error:
              "Database migration required: add mime_type and is_user_upload columns to public.files.",
          },
          { status: 400 }
        );
      }

      throw fileError;
    }

    if (!fileRow) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    if (!fileRow.is_user_upload) {
      return NextResponse.json(
        { error: "Only uploaded image files can be deleted from this endpoint." },
        { status: 400 }
      );
    }

    const { data: websiteRow, error: websiteError } = await supabase
      .from("websites")
      .select("chat_id")
      .eq("id", fileRow.website_id)
      .maybeSingle();

    if (websiteError) {
      throw websiteError;
    }

    if (!websiteRow) {
      return NextResponse.json({ error: "Website not found." }, { status: 404 });
    }

    const ownsChat = await assertChatOwnership(user.id, websiteRow.chat_id, supabase);
    if (!ownsChat) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { error: deleteError } = await supabase.from("files").delete().eq("id", fileId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true, fileId });
  } catch (error) {
    console.error("DELETE /api/website/upload-image error:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
