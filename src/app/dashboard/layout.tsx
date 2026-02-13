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

  // Fetch user profile for display name
  const { data: profile } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();

  // Fetch chat list for sidebar
  const chats = await getUserChats(supabase);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <Sidebar
        chats={chats}
        userName={profile?.name ?? null}
        userId={user.id}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
