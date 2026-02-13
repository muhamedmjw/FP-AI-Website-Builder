import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { getUserChats } from "@/lib/services/chat-service";
import Sidebar from "@/components/dashboard/sidebar";

/**
 * Dashboard layout — wraps /dashboard and /builder pages.
 * Fetches session + chat list on the server, then renders
 * the sidebar alongside the page content.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseServerClient();

  // Get the current user (middleware already protects this route)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile for sidebar account data
  const { data: profile } = await supabase
    .from("users")
    .select("name, email, avatar_url")
    .eq("id", user.id)
    .single();

  // Fetch chat list for sidebar
  const chats = await getUserChats(supabase);

  return (
    <div className="flex h-screen bg-[var(--app-bg)] text-neutral-200">
      <Sidebar
        chats={chats}
        userName={profile?.name ?? null}
        userEmail={profile?.email ?? user.email ?? null}
        userAvatarUrl={profile?.avatar_url ?? null}
      />
      <main className="flex-1 overflow-y-auto bg-[var(--app-bg)]">{children}</main>
    </div>
  );
}
