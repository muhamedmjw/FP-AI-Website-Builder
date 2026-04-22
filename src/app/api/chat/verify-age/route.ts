import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/shared/services/user-service";
import { getSupabaseRouteClient } from "@/server/supabase/server-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const chatId = body?.chatId;
    const acknowledgment = body?.acknowledgment;

    if (!chatId) {
      return NextResponse.json({ error: "chatId is required." }, { status: 400 });
    }

    if (!acknowledgment || typeof acknowledgment !== "string" || acknowledgment.trim() === "") {
      return NextResponse.json({ error: "acknowledgment string is required." }, { status: 400 });
    }

    const { supabase } = getSupabaseRouteClient(request);
    const user = await getCurrentUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Update the chat to be age_verified
    const { error } = await supabase
      .from("chats")
      .update({ age_verified: true, needs_age_verification: false })
      .eq("id", chatId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to update chat." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/chat/verify-age error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
