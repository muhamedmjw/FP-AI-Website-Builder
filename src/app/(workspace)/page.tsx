import HomePage from "@/client/pages/home";
import GuestHomePage from "@/client/pages/guest-home";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getCurrentUser } from "@/shared/services/user-service";

export default async function AppHomePage() {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser(supabase);

  if (!user) {
    return <GuestHomePage />;
  }

  return <HomePage />;
}
