import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getUserChats } from "@/shared/services/chat-service";
import { getCurrentUser, getUserProfile } from "@/shared/services/user-service";
import Sidebar from "@/client/features/sidebar/sidebar";
import AuthSessionSync from "@/client/components/auth-session-sync";
import WorkspaceShell from "@/client/components/workspace-shell";

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

  // Fetch user profile and chat list in parallel
  const [profile, chats] = await Promise.all([
    getUserProfile(supabase, user.id),
    getUserChats(supabase),
  ]);

  return (
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
  );
}
