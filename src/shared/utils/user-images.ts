import { SupabaseClient } from "@supabase/supabase-js";
import { isMissingUploadColumns } from "@/shared/utils/db-guards";
import type { HtmlImageAsset } from "@/shared/utils/html-images";

/**
 * Loads selected and available uploaded images for a website.
 * This keeps route handlers focused on orchestration instead of query details.
 */
export async function resolveUserImages(
  supabase: SupabaseClient,
  websiteId: string | null,
  selectedImageFileIds: string[]
): Promise<{
  userImages: HtmlImageAsset[];
  websiteImagePool: HtmlImageAsset[];
}> {
  if (!websiteId) {
    return { userImages: [], websiteImagePool: [] };
  }

  let userImages: HtmlImageAsset[] = [];
  let websiteImagePool: HtmlImageAsset[] = [];

  if (selectedImageFileIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from("files")
        .select("id, file_name, content")
        .eq("website_id", websiteId)
        .eq("is_user_upload", true)
        .in("id", selectedImageFileIds);

      if (error) {
        throw error;
      }

      const imageById = new Map(
        (data ?? []).map((row) => [
          row.id,
          {
            fileName: row.file_name,
            dataUri: row.content,
          },
        ])
      );

      userImages = selectedImageFileIds
        .map((id) => imageById.get(id))
        .filter((image): image is HtmlImageAsset => Boolean(image));
    } catch (error) {
      if (isMissingUploadColumns(error)) {
        userImages = [];
      } else {
        throw error;
      }
    }
  }

  try {
    const { data, error } = await supabase
      .from("files")
      .select("file_name, content")
      .eq("website_id", websiteId)
      .eq("is_user_upload", true)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    websiteImagePool = (data ?? []).map((row) => ({
      fileName: row.file_name,
      dataUri: row.content,
    }));
  } catch (error) {
    if (isMissingUploadColumns(error)) {
      websiteImagePool = [];
    } else {
      throw error;
    }
  }

  if (websiteImagePool.length === 0 && userImages.length > 0) {
    websiteImagePool = userImages;
  }

  return { userImages, websiteImagePool };
}
