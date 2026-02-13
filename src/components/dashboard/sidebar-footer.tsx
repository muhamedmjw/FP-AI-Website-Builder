"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

/**
 * Bottom section of the sidebar — sign out button.
 */
export default function SidebarFooter() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      router.push("/");
    } catch (error) {
      console.error("Failed to sign out:", error);
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="border-t border-slate-800 px-4 py-3.5">
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="flex h-10.5 w-full items-center gap-2 rounded-lg px-3 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <LogOut size={15} />
        {isSigningOut ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}
