import { Buffer } from "node:buffer";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { createWebsite, getWebsiteByChatId } from "@/server/services/website-service";
import { getCurrentUser } from "@/shared/services/user-service";

type PostgresLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;
const IMAGE_MIME_TYPE_REGEX = /^image\//i;
const MISSING_COLUMNS_ERROR =
  "Database migration required: add is_user_upload (boolean) and mime_type (text) columns to public.files.";

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

function toImageExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "png";
  }
}

async function hasUploadColumns(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("files")
      .select("id, is_user_upload, mime_type")
      .limit(1);

    if (error) {
      if (isMissingUploadColumns(error)) {
        return false;
      }
      throw error;
    }

    return true;
  } catch (error) {
    if (isMissingUploadColumns(error)) {
      return false;
    }
    throw error;
  }
}

async function userOwnsChat(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  userId: string,
  chatId: string
): Promise<boolean> {
  try {
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
  } catch (error) {
    throw error;
  }
}

async function resolveWebsiteForChat(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  chatId: string
): Promise<{ id: string }> {
  let website = await getWebsiteByChatId(supabase, chatId);

  if (!website) {
    try {
      website = await createWebsite(supabase, chatId, "");
    } catch (error) {
      const pgError = error as PostgresLikeError;

      if (pgError.code === "23505") {
        website = await getWebsiteByChatId(supabase, chatId);
      } else {
        throw error;
      }
    }
  }

  if (!website) {
    throw new Error("Failed to resolve website for this chat.");
  }

  return { id: website.id };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const user = await getCurrentUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const columnsAvailable = await hasUploadColumns(supabase);
    if (!columnsAvailable) {
      return NextResponse.json({ error: MISSING_COLUMNS_ERROR }, { status: 400 });
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
      return NextResponse.json({ error: "Only image/* files are allowed." }, { status: 400 });
    }

    if (fileValue.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image size must be 4 MB or less." },
        { status: 400 }
      );
    }

    const ownsChat = await userOwnsChat(supabase, user.id, chatId);

    if (!ownsChat) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const website = await resolveWebsiteForChat(supabase, chatId);
    const extension = toImageExtension(mimeType);
    const fileName = `assets/images/${crypto.randomUUID()}.${extension}`;

    const base64 = Buffer.from(await fileValue.arrayBuffer()).toString("base64");
    const dataUri = `data:${mimeType};base64,${base64}`;

    try {
      const { data, error } = await supabase
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

      if (error) {
        if (isMissingUploadColumns(error)) {
          return NextResponse.json({ error: MISSING_COLUMNS_ERROR }, { status: 400 });
        }

        throw error;
      }

      return NextResponse.json({
        fileId: data.id,
        fileName: data.file_name,
        dataUri: data.content,
      });
    } catch (error) {
      if (isMissingUploadColumns(error)) {
        return NextResponse.json({ error: MISSING_COLUMNS_ERROR }, { status: 400 });
      }

      throw error;
    }
  } catch (error) {
    console.error("POST /api/website/upload-image failed:", error);

    const message = error instanceof Error ? error.message : "Internal server error.";
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

    const columnsAvailable = await hasUploadColumns(supabase);
    if (!columnsAvailable) {
      return NextResponse.json({ error: MISSING_COLUMNS_ERROR }, { status: 400 });
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
        return NextResponse.json({ error: MISSING_COLUMNS_ERROR }, { status: 400 });
      }

      throw fileError;
    }

    if (!fileRow) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    if (!fileRow.is_user_upload) {
      return NextResponse.json(
        { error: "Only user-uploaded images can be deleted from this endpoint." },
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

    const ownsChat = await userOwnsChat(supabase, user.id, websiteRow.chat_id);

    if (!ownsChat) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { error: deleteError } = await supabase.from("files").delete().eq("id", fileId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true, fileId });
  } catch (error) {
    console.error("DELETE /api/website/upload-image failed:", error);

    const message = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
