import HomePage from "@/client/views/home";
import AccountPageView from "@/client/views/account";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getCurrentUser } from "@/shared/services/user-service";

export default async function AppHomePage() {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser(supabase);

  if (!user) {
    return <AccountPageView />;
  }

  return <HomePage />;
}
