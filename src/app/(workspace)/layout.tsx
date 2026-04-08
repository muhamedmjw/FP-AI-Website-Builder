import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getUserChats } from "@/shared/services/chat-service";
import { getCurrentUser, getUserProfile } from "@/shared/services/user-service";
import Sidebar from "@/client/features/sidebar/sidebar";
import AuthSessionSync from "@/client/components/auth-session-sync";
import WorkspaceShell from "@/client/components/workspace-shell";
import WorkspaceProviders from "@/client/components/workspace-providers";
import type { AppLanguage } from "@/shared/types/database";

function isAppLanguage(value: unknown): value is AppLanguage {
  return value === "en" || value === "ar" || value === "ku";
}

/**
 * Workspace layout for "/" and "/chat".
 * - Authenticated users get the full app shell with sidebar/history.
 * - Guests get a sidebar-free shell (chat is temporary and local).
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseServerClient();

  // "/" is public for guest mode, while "/chat/*" remains protected.
  const user = await getCurrentUser(supabase);

  if (!user) {
    return (
      <WorkspaceShell sidebar={null} hasSidebar={false}>
        <AuthSessionSync />
        {children}
      </WorkspaceShell>
    );
  }

  // Fetch user profile and chat list in parallel with safe fallbacks.
  const [profile, chats] = await Promise.all([
    getUserProfile(supabase, user.id).catch((error) => {
      console.error("Failed to load user profile:", error);
      return null;
    }),
    getUserChats(supabase).catch((error) => {
      console.error("Failed to load chat list:", error);
      return [];
    }),
  ]);

  const { data: preferences, error: preferencesError } = await supabase
    .from("user_preferences")
    .select("language")
    .eq("user_id", user.id)
    .maybeSingle();

  if (preferencesError) {
    console.error("Failed to load user preferences:", preferencesError);
  }

  const hasLanguagePreference = isAppLanguage(preferences?.language);

  const preferredLanguage: AppLanguage = isAppLanguage(preferences?.language)
    ? preferences.language
    : "en";

  return (
    <WorkspaceProviders
      language={preferredLanguage}
      hasLanguagePreference={hasLanguagePreference}
    >
      <WorkspaceShell
        hasSidebar
        sidebar={
          <Sidebar
            chats={chats}
            userName={profile?.name ?? null}
            userEmail={profile?.email ?? user.email ?? null}
            userAvatarUrl={profile?.avatarUrl ?? null}
          />
        }
      >
        <AuthSessionSync />
        {children}
      </WorkspaceShell>
    </WorkspaceProviders>
  );
}
