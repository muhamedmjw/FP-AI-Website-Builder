import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getUserChats } from "@/shared/services/chat-service";
import { getCurrentUser, getUserProfile } from "@/shared/services/user-service";
import Sidebar from "@/client/features/sidebar/sidebar";
import AuthSessionSync from "@/client/components/auth-session-sync";

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
      <div className="flex h-screen bg-[var(--app-bg)] text-[var(--app-text-primary)]">
        <AuthSessionSync />
        <main className="flex-1 overflow-y-auto bg-[var(--app-bg)]">
          {children}
        </main>
      </div>
    );
  }

  // Fetch user profile for sidebar account data
  const profile = await getUserProfile(supabase, user.id);

  // Fetch chat list for sidebar
  const chats = await getUserChats(supabase);

  return (
    <div className="flex h-screen bg-[var(--app-bg)] text-[var(--app-text-primary)]">
      <AuthSessionSync />
      <Sidebar
        chats={chats}
        userName={profile?.name ?? null}
        userEmail={profile?.email ?? user.email ?? null}
        userAvatarUrl={profile?.avatarUrl ?? null}
      />
      <main className="flex-1 overflow-y-auto bg-[var(--app-bg)]">{children}</main>
    </div>
  );
}
