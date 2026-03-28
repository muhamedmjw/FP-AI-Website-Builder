/**
 * Website service — database operations for generated websites and files.
 *
 * Part of the "Model" layer. Handles creating websites, storing
 * generated HTML, and retrieving the latest output for preview/export.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Website, FileRecord, FileVersionRecord } from "@/shared/types/database";

/** Create a website record linked to a chat. */
export async function createWebsite(
  supabase: SupabaseClient,
  chatId: string,
  businessPrompt: string,
  language: "en" | "ar" | "ku" = "en"
): Promise<Website> {
  const { data, error } = await supabase
    .from("websites")
    .insert({ chat_id: chatId, business_prompt: businessPrompt, language })
    .select()
    .single();

  if (error) throw error;
  return data as Website;
}

/** Get the website linked to a chat (each chat has at most one). */
export async function getWebsiteByChatId(
  supabase: SupabaseClient,
  chatId: string
): Promise<Website | null> {
  const { data, error } = await supabase
    .from("websites")
    .select("*")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (error) throw error;
  return data as Website | null;
}

/** Save (upsert) the generated HTML file for a website. */
export async function saveGeneratedHtml(
  supabase: SupabaseClient,
  websiteId: string,
  html: string
): Promise<FileRecord> {
  const { data: existingFile, error: existingFileError } = await supabase
    .from("files")
    .select("id, content, version")
    .eq("website_id", websiteId)
    .eq("file_name", "index.html")
    .maybeSingle();

  if (existingFileError) throw existingFileError;

  if (existingFile) {
    const { error: archiveError } = await supabase.from("file_versions").insert({
      file_id: existingFile.id,
      website_id: websiteId,
      version: existingFile.version,
      content: existingFile.content,
    });

    if (archiveError) throw archiveError;
  }

  const nextVersion = existingFile ? existingFile.version + 1 : 1;

  const { data, error } = await supabase
    .from("files")
    .upsert(
      {
        website_id: websiteId,
        file_name: "index.html",
        content: html,
        version: nextVersion,
      },
      { onConflict: "website_id,file_name" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as FileRecord;
}

/** Get the latest generated HTML for a website. */
export async function getGeneratedHtml(
  supabase: SupabaseClient,
  websiteId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("files")
    .select("content")
    .eq("website_id", websiteId)
    .eq("file_name", "index.html")
    .maybeSingle();

  if (error) throw error;
  return data?.content ?? null;
}

/** Returns all stored historical versions for a website, newest version first. */
export async function getFileVersions(
  supabase: SupabaseClient,
  websiteId: string
): Promise<FileVersionRecord[]> {
  const { data, error } = await supabase
    .from("file_versions")
    .select("*")
    .eq("website_id", websiteId)
    .order("version", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as FileVersionRecord[];
}

/**
 * Restores a historical file version into files/index.html and snapshots current content.
 */
export async function restoreFileVersion(
  supabase: SupabaseClient,
  websiteId: string,
  versionId: string
): Promise<FileRecord> {
  const { data: targetVersion, error: targetVersionError } = await supabase
    .from("file_versions")
    .select("*")
    .eq("id", versionId)
    .eq("website_id", websiteId)
    .single();

  if (targetVersionError) throw targetVersionError;

  const { data: currentFile, error: currentFileError } = await supabase
    .from("files")
    .select("id, content, version")
    .eq("website_id", websiteId)
    .eq("file_name", "index.html")
    .single();

  if (currentFileError) throw currentFileError;

  const { error: archiveCurrentError } = await supabase.from("file_versions").insert({
    file_id: currentFile.id,
    website_id: websiteId,
    version: currentFile.version,
    content: currentFile.content,
  });

  if (archiveCurrentError) throw archiveCurrentError;

  const { data: restoredFile, error: restoreError } = await supabase
    .from("files")
    .update({
      content: targetVersion.content,
      version: currentFile.version + 1,
    })
    .eq("id", currentFile.id)
    .select()
    .single();

  if (restoreError) throw restoreError;

  return restoredFile as FileRecord;
}

/** Update whether a website is publicly shareable. */
export async function setWebsitePublic(
  supabase: SupabaseClient,
  websiteId: string,
  isPublic: boolean
): Promise<Website> {
  const { data, error } = await supabase
    .from("websites")
    .update({ is_public: isPublic })
    .eq("id", websiteId)
    .select()
    .single();

  if (error) throw error;
  return data as Website;
}

/**
 * Fetch public website HTML via an anonymous client, without requiring auth.
 */
export async function getPublicWebsiteHtml(
  _supabase: SupabaseClient,
  chatId: string
): Promise<{ website: Website; html: string } | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const anonSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: website, error: websiteError } = await anonSupabase
    .from("websites")
    .select("*")
    .eq("chat_id", chatId)
    .eq("is_public", true)
    .maybeSingle();

  if (websiteError) throw websiteError;
  if (!website) return null;

  const { data: file, error: fileError } = await anonSupabase
    .from("files")
    .select("content")
    .eq("website_id", website.id)
    .eq("file_name", "index.html")
    .maybeSingle();

  if (fileError) throw fileError;
  if (!file?.content) return null;

  return {
    website: website as Website,
    html: file.content,
  };
}
