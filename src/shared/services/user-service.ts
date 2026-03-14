import { SupabaseClient, User as SupabaseUser } from "@supabase/supabase-js";
import { isMissingSessionError } from "@/shared/utils/auth-errors";

export type UserProfile = {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const metadataName =
    typeof user?.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : typeof user?.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null;
  const metadataAvatarUrl =
    typeof user?.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;

  if (!data) {
    // Self-heal legacy/missing profile rows so refreshes always show saved profile data.
    if (user?.id === userId) {
      const fallbackProfile = {
        name: metadataName,
        email: user.email ?? null,
        avatarUrl: metadataAvatarUrl,
      };

      const { error: upsertError } = await supabase.from("users").upsert(
        {
          id: userId,
          name: fallbackProfile.name,
          email: fallbackProfile.email ?? "",
          avatar_url: fallbackProfile.avatarUrl,
        },
        { onConflict: "id" }
      );

      if (upsertError) {
        throw upsertError;
      }

      return fallbackProfile;
    }

    return null;
  }

  return {
    name: data.name ?? metadataName ?? null,
    email: data.email ?? user?.email ?? null,
    avatarUrl: data.avatar_url ?? metadataAvatarUrl ?? null,
  };
}
