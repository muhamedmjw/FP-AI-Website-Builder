/**
 * Generation Manager - Tracks and manages active AI generations with abort support.
 * Uses AbortController to cancel in-flight AI requests.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";

type ActiveGeneration = {
  chatId: string;
  abortController: AbortController;
  startedAt: number;
  modelRequest?: ReturnType<OpenAI["chat"]["completions"]["create"]>;
};

// Map of chatId -> active generation
const activeGenerations = new Map<string, ActiveGeneration>();

/**
 * Register a new active generation for a chat.
 */
export function registerGeneration(
  chatId: string,
  abortController: AbortController
): void {
  // Abort any existing generation for this chat first
  abortGeneration(chatId);

  activeGenerations.set(chatId, {
    chatId,
    abortController,
    startedAt: Date.now(),
  });
}

/**
 * Set the model request promise for an active generation.
 * This allows us to await it before fully cleaning up.
 */
export function setGenerationRequest(
  chatId: string,
  request: ReturnType<OpenAI["chat"]["completions"]["create"]>
): void {
  const generation = activeGenerations.get(chatId);
  if (generation) {
    generation.modelRequest = request;
  }
}

/**
 * Abort an active generation for a chat.
 * Returns true if a generation was found and aborted.
 */
export function abortGeneration(chatId: string): boolean {
  const generation = activeGenerations.get(chatId);
  if (!generation) {
    return false;
  }

  try {
    generation.abortController.abort("Generation cancelled by user");
  } catch {
    // Ignore abort errors
  }

  activeGenerations.delete(chatId);
  return true;
}

/**
 * Clean up a completed generation without aborting.
 */
export function completeGeneration(chatId: string): void {
  activeGenerations.delete(chatId);
}

/**
 * Check if a chat has an active generation.
 */
export function hasActiveGeneration(chatId: string): boolean {
  return activeGenerations.has(chatId);
}

/**
 * Get all active generation chat IDs.
 */
export function getActiveGenerationIds(): string[] {
  return Array.from(activeGenerations.keys());
}

/**
 * Abort all generations and return the count of aborted generations.
 */
export function abortAllGenerations(): number {
  const ids = getActiveGenerationIds();
  ids.forEach((id) => abortGeneration(id));
  return ids.length;
}

/**
 * Log a cancelled generation to the database.
 */
export async function logCancelledGeneration(
  supabase: SupabaseClient,
  chatId: string,
  modelName: string
): Promise<void> {
  try {
    await supabase.from("ai_generations").insert({
      chat_id: chatId,
      model_name: modelName,
      prompt_tokens: null,
      completion_tokens: null,
      total_tokens: null,
      status: "cancelled",
      duration_ms: 0,
    });
  } catch (error) {
    console.error("Failed to log cancelled generation:", error);
  }
}
