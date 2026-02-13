"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

/**
 * Bottom section of the sidebar — sign out button.
 */
export default function SidebarFooter() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="border-t border-slate-800 px-4 py-3.5">
      <button
        type="button"
        onClick={handleSignOut}
        className="flex h-10.5 w-full items-center gap-2 rounded-lg px-3 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
      >
        <LogOut size={15} />
        Sign out
      </button>
    </div>
  );
}
