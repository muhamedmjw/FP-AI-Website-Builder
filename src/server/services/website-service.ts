/**
 * Website service — database operations for generated websites and files.
 *
 * Part of the "Model" layer. Handles creating websites, storing
 * generated HTML, and retrieving the latest output for preview/export.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { Website, FileRecord } from "@/shared/types/database";

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
  const { data, error } = await supabase
    .from("files")
    .upsert(
      { website_id: websiteId, file_name: "index.html", content: html },
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
