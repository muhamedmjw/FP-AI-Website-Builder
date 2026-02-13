import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { getUserChats } from "@/lib/services/chat-service";
import { getCurrentUser, getUserProfile } from "@/lib/services/user-service";
import Sidebar from "@/components/dashboard/sidebar";

/**
 * Authenticated app layout - wraps / and /chat pages.
 * Fetches session + chat list on the server, then renders
 * the sidebar alongside the page content.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseServerClient();

  // Get the current user (middleware already protects this route)
  const user = await getCurrentUser(supabase);

  if (!user) {
    redirect("/account");
  }

  // Fetch user profile for sidebar account data
  const profile = await getUserProfile(supabase, user.id);

  // Fetch chat list for sidebar
  const chats = await getUserChats(supabase);

  return (
    <div className="flex h-screen bg-[var(--app-bg)] text-neutral-200">
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
