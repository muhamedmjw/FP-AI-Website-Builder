/**
 * Chat service — all database operations related to chats and messages.
 *
 * This is the "Model" layer. Components and API routes call these
 * functions instead of querying Supabase directly.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { Chat, HistoryMessage } from "@/shared/types/database";

// --- Chats ---

/** Get all chats for the current user, newest first. */
export async function getUserChats(supabase: SupabaseClient): Promise<Chat[]> {
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data as Chat[];
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
  content: string
): Promise<HistoryMessage> {
  const { data, error } = await supabase
    .from("history")
    .insert({ chat_id: chatId, role, content })
    .select()
    .single();

  if (error) throw error;
  return data as HistoryMessage;
}
