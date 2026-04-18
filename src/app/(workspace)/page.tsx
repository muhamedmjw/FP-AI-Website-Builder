import WorkspaceView from "@/client/views/workspace-view";
import LandingView from "@/client/views/landing-view";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getCurrentUser } from "@/shared/services/user-service";

export default async function AppHomePage() {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser(supabase);

  if (!user) {
    return <LandingView />;
  }

  return <WorkspaceView />;
}
