/**
 * Client-side generation abort registry.
 * Tracks active AbortControllers by chatId so any component
 * (e.g. sidebar delete) can cancel an in-flight send request.
 */

const activeClientGenerations = new Map<string, AbortController>();

/**
 * Register a client-side AbortController for a chat's send request.
 */
export function registerClientAbort(chatId: string, controller: AbortController): void {
  // Abort any existing controller for this chat first
  abortClientGeneration(chatId);
  activeClientGenerations.set(chatId, controller);
}

/**
 * Abort the client-side fetch for a chat.
 * Returns true if a controller was found and aborted.
 */
export function abortClientGeneration(chatId: string): boolean {
  const controller = activeClientGenerations.get(chatId);
  if (!controller) {
    return false;
  }

  try {
    controller.abort();
  } catch {
    // Ignore abort errors
  }

  activeClientGenerations.delete(chatId);
  return true;
}

/**
 * Clean up a completed generation without aborting.
 */
export function completeClientGeneration(chatId: string): void {
  activeClientGenerations.delete(chatId);
}
