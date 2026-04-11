import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { MAX_GUEST_PROMPTS } from "@/shared/constants/limits";

const GUEST_TOKEN_COOKIE = "guest_token";
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function getServiceClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase server credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  if (anonKey && serviceRoleKey === anonKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is using the anon key value. Use the real service role key from Supabase settings."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function hasWindowExpired(firstPromptAt: string): boolean {
  const firstPromptTime = new Date(firstPromptAt).getTime();
  const now = Date.now();
  return now - firstPromptTime >= RATE_LIMIT_WINDOW_MS;
}

/**
 * GET /api/guest/usage
 *
 * Returns the guest usage status including:
 * - promptsUsed: number of prompts used in current 24-hour window
 * - promptsRemaining: number of prompts remaining
 * - maxPrompts: maximum allowed prompts per window
 * - limitReached: whether the limit has been reached
 * - resetsAt: ISO timestamp of when the 24-hour window resets
 * - msUntilReset: milliseconds until the limit resets
 */
export async function GET(request: NextRequest) {
  try {
    const guestToken = request.cookies.get(GUEST_TOKEN_COOKIE)?.value ?? "";
    
    // If no guest token, they haven't used any prompts yet
    if (!guestToken) {
      return NextResponse.json({
        promptsUsed: 0,
        promptsRemaining: MAX_GUEST_PROMPTS,
        maxPrompts: MAX_GUEST_PROMPTS,
        limitReached: false,
        resetsAt: "",
        msUntilReset: 0,
      });
    }

    const serviceClient = getServiceClient();

    try {
      const { data, error } = await serviceClient
        .from("guest_usage")
        .select("prompts_used_today, first_prompt_at, last_prompt_at")
        .eq("guest_token", guestToken)
        .maybeSingle();

      if (error) throw error;

      // If no data, return fresh state
      if (!data) {
        return NextResponse.json({
          promptsUsed: 0,
          promptsRemaining: MAX_GUEST_PROMPTS,
          maxPrompts: MAX_GUEST_PROMPTS,
          limitReached: false,
          resetsAt: "",
          msUntilReset: 0,
        });
      }

      // Handle old data without first_prompt_at - use last_prompt_at as fallback
      const windowStart = data.first_prompt_at || data.last_prompt_at;
      const windowExpired = windowStart ? hasWindowExpired(windowStart) : true;

      if (windowExpired) {
        return NextResponse.json({
          promptsUsed: 0,
          promptsRemaining: MAX_GUEST_PROMPTS,
          maxPrompts: MAX_GUEST_PROMPTS,
          limitReached: false,
          resetsAt: "",
          msUntilReset: 0,
        });
      }

      const promptsUsed = data.prompts_used_today;
      const promptsRemaining = Math.max(0, MAX_GUEST_PROMPTS - promptsUsed);
      const limitReached = promptsUsed >= MAX_GUEST_PROMPTS;
      
      // Calculate when the window resets (24 hours from window start)
      const windowStartTime = new Date(windowStart!).getTime();
      const resetsAt = new Date(windowStartTime + RATE_LIMIT_WINDOW_MS).toISOString();
      const msUntilReset = Math.max(0, (windowStartTime + RATE_LIMIT_WINDOW_MS) - Date.now());

      return NextResponse.json({
        promptsUsed,
        promptsRemaining,
        maxPrompts: MAX_GUEST_PROMPTS,
        limitReached,
        resetsAt,
        msUntilReset,
      });
    } catch (error) {
      // If we can't read usage (e.g., permissions issue), assume they have full quota
      console.error("Failed to fetch guest usage:", error);
      
      return NextResponse.json({
        promptsUsed: 0,
        promptsRemaining: MAX_GUEST_PROMPTS,
        maxPrompts: MAX_GUEST_PROMPTS,
        limitReached: false,
        resetsAt: "",
        msUntilReset: 0,
      });
    }
  } catch (error) {
    console.error("GET /api/guest/usage error:", error);
    
    const message =
      process.env.NODE_ENV === "development"
        ? error instanceof Error
          ? error.message
          : "Internal server error."
        : "Internal server error.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
