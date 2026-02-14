import { SupabaseClient, User as SupabaseUser } from "@supabase/supabase-js";

export type UserProfile = {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

function isMissingSessionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as {
    name?: string;
    message?: string;
    status?: number;
    __isAuthError?: boolean;
  };

  if (maybeError.name === "AuthSessionMissingError") {
    return true;
  }

  if (
    maybeError.__isAuthError &&
    maybeError.status === 400 &&
    typeof maybeError.message === "string" &&
    maybeError.message.toLowerCase().includes("auth session missing")
  ) {
    return true;
  }

  return false;
}

/**
 * Returns the authenticated user for the current request/session.
 * Returns null when no auth session exists.
 * Throws for unexpected Supabase auth errors.
 */
export async function getCurrentUser(
  supabase: SupabaseClient
): Promise<SupabaseUser | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (isMissingSessionError(error)) {
      return null;
    }
    throw error;
  }

  return user;
}

/** Loads profile data from the public users table. */
export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("name, email, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return null;
  }

  return {
    name: data.name ?? null,
    email: data.email ?? null,
    avatarUrl: data.avatar_url ?? null,
  };
}
