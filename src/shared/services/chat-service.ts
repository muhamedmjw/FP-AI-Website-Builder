/**
 * Chat service — all database operations related to chats and messages.
 *
 * This is the "Model" layer. Components and API routes call these
 * functions instead of querying Supabase directly.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { Chat, HistoryMessage } from "@/shared/types/database";

function isMissingArchivedAtColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const message = [
    (error as { message?: string }).message,
    (error as { details?: string }).details,
    (error as { hint?: string }).hint,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return message.includes("archived_at") && message.includes("column");
}

// --- Chats ---

/** Get all chats for the current user, newest first. */
export async function getUserChats(supabase: SupabaseClient): Promise<Chat[]> {
  const activeResult = await supabase
    .from("chats")
    .select("*")
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (!activeResult.error) {
    return (activeResult.data ?? []) as Chat[];
  }

  if (!isMissingArchivedAtColumn(activeResult.error)) {
    throw activeResult.error;
  }

  // Fallback for environments where archived_at migration has not run yet.
  const fallbackResult = await supabase
    .from("chats")
    .select("*")
    .order("updated_at", { ascending: false });

  if (fallbackResult.error) throw fallbackResult.error;
  return (fallbackResult.data ?? []) as Chat[];
}

/** Get archived chats for the current user, newest first. */
export async function getArchivedChats(
  supabase: SupabaseClient
): Promise<Chat[]> {
  const archivedResult = await supabase
    .from("chats")
    .select("*")
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });

  if (!archivedResult.error) {
    return (archivedResult.data ?? []) as Chat[];
  }

  if (isMissingArchivedAtColumn(archivedResult.error)) {
    return [];
  }

  throw archivedResult.error;
}

/** Create a new chat and return it. */
export async function createChat(
  supabase: SupabaseClient,
  userId: string,
  title: string = "New Website"
): Promise<Chat> {
  const { data, error } = await supabase
    .from("chats")
    .insert({ user_id: userId, title })
    .select()
    .single();

  if (error) throw error;
  return data as Chat;
}

/** Delete a chat by ID. */
export async function deleteChat(
  supabase: SupabaseClient,
  chatId: string
): Promise<void> {
  const { error } = await supabase.from("chats").delete().eq("id", chatId);
  if (error) throw error;
}

/** Archive a chat by ID. */
export async function archiveChat(
  supabase: SupabaseClient,
  chatId: string
): Promise<void> {
  const { error } = await supabase
    .from("chats")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", chatId);

  if (error) {
    if (isMissingArchivedAtColumn(error)) {
      throw new Error(
        "Archive support is not available yet. Please run the latest database migration."
      );
    }

    throw error;
  }
}

/** Restore an archived chat by ID. */
export async function restoreChat(
  supabase: SupabaseClient,
  chatId: string
): Promise<void> {
  const { error } = await supabase
    .from("chats")
    .update({ archived_at: null })
    .eq("id", chatId);

  if (error) {
    if (isMissingArchivedAtColumn(error)) {
      throw new Error(
        "Archive support is not available yet. Please run the latest database migration."
      );
    }

    throw error;
  }
}

/** Rename a chat. */
export async function renameChat(
  supabase: SupabaseClient,
  chatId: string,
  newTitle: string
): Promise<void> {
  const { error } = await supabase
    .from("chats")
    .update({ title: newTitle })
    .eq("id", chatId);

  if (error) throw error;
}

// --- Messages ---

/** Get all messages for a chat, oldest first. */
export async function getChatMessages(
  supabase: SupabaseClient,
  chatId: string
): Promise<HistoryMessage[]> {
  const { data, error } = await supabase
    .from("history")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as HistoryMessage[];
}

/** Insert a single message into a chat. */
export async function addMessage(
  supabase: SupabaseClient,
  chatId: string,
  role: "user" | "assistant" | "system",
  content: string,
  imageFileIds?: string[]
): Promise<HistoryMessage> {
  const insertPayload: Record<string, unknown> = {
    chat_id: chatId,
    role,
    content,
  };

  if (imageFileIds && imageFileIds.length > 0) {
    insertPayload.image_file_ids = imageFileIds;
  }

  const { data, error } = await supabase
    .from("history")
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw error;
  return data as HistoryMessage;
}
