import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { generateGuestAIResponse } from "@/server/services/ai-service";
import { MAX_GUEST_PROMPTS, MAX_PROMPT_LENGTH } from "@/shared/constants/limits";
import type { AppLanguage } from "@/shared/types/database";

const GUEST_TOKEN_COOKIE = "guest_token";
const GUEST_TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function isAppLanguage(value: unknown): value is AppLanguage {
  return value === "en" || value === "ar" || value === "ku";
}

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

  return createClient(
    supabaseUrl,
    serviceRoleKey
  );
}

function generateGuestToken(): string {
  return crypto.randomUUID();
}

/**
 * Read the guest_usage row for the given token + today's date.
 * Returns null if no row exists yet.
 */
async function getGuestUsage(
  supabase: SupabaseClient,
  guestToken: string
) {
  const { data, error } = await supabase
    .from("guest_usage")
    .select("id, prompts_used_today, usage_date")
    .eq("guest_token", guestToken)
    .maybeSingle();

  if (error) throw error;
  return data as {
    id: string;
    prompts_used_today: number;
    usage_date: string;
  } | null;
}

function normalizeDateOnly(value: string): string {
  const [datePart] = value.split("T");
  return datePart;
}

function isPermissionDeniedError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeCode = (error as { code?: unknown }).code;
  return maybeCode === "42501";
}

/**
 * Increment (or create) the guest_usage row after a successful AI response.
 */
async function incrementGuestUsage(
  supabase: SupabaseClient,
  guestToken: string,
  today: string
) {
  const existing = await getGuestUsage(supabase, guestToken);

  if (existing) {
    const isToday = normalizeDateOnly(existing.usage_date) === today;
    const { error } = await supabase
      .from("guest_usage")
      .update({
        prompts_used_today: isToday ? existing.prompts_used_today + 1 : 1,
        usage_date: today,
        last_prompt_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) throw error;
  } else {
    const { error } = await supabase.from("guest_usage").insert({
      guest_token: guestToken,
      prompts_used_today: 1,
      usage_date: today,
      last_prompt_at: new Date().toISOString(),
    });

    if (error) throw error;
  }
}

/**
 * POST /api/guest/chat
 *
 * Calls the AI for guest users (no auth required).
 * Rate-limited to MAX_GUEST_PROMPTS per day per guest token.
 *
 * Request body: { content: string, history?: Array<{ role, content }> }
 * Response:     { type, message, html? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, history, language } = body;
    const preferredLanguage: AppLanguage = isAppLanguage(language)
      ? language
      : "en";

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        {
          type: "questions",
          message: "content is required.",
          error: "content is required.",
        },
        { status: 400 }
      );
    }

    if (content.trim().length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        {
          type: "questions",
          message: "Prompt too long.",
          error: "Prompt too long.",
        },
        { status: 400 }
      );
    }

    // Read or generate guest token from cookie
    let guestToken = request.cookies.get(GUEST_TOKEN_COOKIE)?.value ?? "";
    let isNewToken = false;
    if (!guestToken) {
      guestToken = generateGuestToken();
      isNewToken = true;
    }

    const serviceClient = getServiceClient();
    const today = new Date().toISOString().split("T")[0];

    // Check rate limit. If guest_usage permissions are broken, allow chat instead
    // of failing the entire request.
    let usageTrackingAvailable = true;
    let promptsUsed = 0;

    try {
      const usage = await getGuestUsage(serviceClient, guestToken);
      promptsUsed =
        usage && normalizeDateOnly(usage.usage_date) === today
          ? usage.prompts_used_today
          : 0;
    } catch (error) {
      usageTrackingAvailable = false;

      if (isPermissionDeniedError(error)) {
        console.error(
          "POST /api/guest/chat guest_usage permission denied; continuing without daily guest limit. Check SUPABASE_SERVICE_ROLE_KEY and public schema grants.",
          error
        );
      } else {
        console.error(
          "POST /api/guest/chat guest_usage lookup failed; continuing without daily guest limit.",
          error
        );
      }
    }

    if (usageTrackingAvailable && promptsUsed >= MAX_GUEST_PROMPTS) {
      return NextResponse.json(
        {
          type: "questions",
          message: "Guest limit reached. Create a free account to continue.",
          error: "Guest limit reached. Create a free account to continue.",
        },
        { status: 429 }
      );
    }

    // Build conversation history for the AI
    const conversationHistory: Array<{
      role: "user" | "assistant";
      content: string;
    }> = [];

    if (Array.isArray(history)) {
      for (const msg of history) {
        if (
          msg &&
          typeof msg === "object" &&
          typeof msg.content === "string" &&
          (msg.role === "user" || msg.role === "assistant")
        ) {
          conversationHistory.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }

    // Add the current user message
    conversationHistory.push({ role: "user", content: content.trim() });

    if (!process.env.DEEPSEEK_API_KEY?.trim()) {
      console.error("POST /api/guest/chat missing DEEPSEEK_API_KEY");
      const message =
        process.env.NODE_ENV === "development"
          ? "DEEPSEEK_API_KEY is not configured on the server."
          : "Internal server error.";

      return NextResponse.json(
        {
          type: "questions",
          message,
          error: message,
        },
        { status: 500 }
      );
    }

    // Call the AI
    let aiResponse: Awaited<ReturnType<typeof generateGuestAIResponse>>;
    try {
      aiResponse = await generateGuestAIResponse(
        conversationHistory,
        preferredLanguage
      );
    } catch (error) {
      console.error("POST /api/guest/chat AI generation error:", error);

      const rawMessage =
        error instanceof Error ? error.message : "Internal server error.";
      const message =
        process.env.NODE_ENV === "development"
          ? rawMessage
          : "Internal server error.";

      return NextResponse.json(
        {
          type: "questions",
          message,
          error: message,
        },
        { status: 500 }
      );
    }

    // Increment usage after successful response, but don't fail response if this write fails.
    if (usageTrackingAvailable) {
      try {
        await incrementGuestUsage(serviceClient, guestToken, today);
      } catch (error) {
        console.error(
          "POST /api/guest/chat failed to increment guest usage; response will still be returned.",
          error
        );
      }
    }

    // Build the response and set the guest token cookie
    const jsonResponse = NextResponse.json({
      type: aiResponse.type,
      message: aiResponse.message,
      html: aiResponse.type === "website" ? aiResponse.html : undefined,
    });

    if (isNewToken) {
      jsonResponse.cookies.set(GUEST_TOKEN_COOKIE, guestToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: GUEST_TOKEN_MAX_AGE,
        path: "/",
      });
    }

    return jsonResponse;
  } catch (error) {
    console.error("POST /api/guest/chat error:", error);
    const rawMessage =
      error instanceof Error ? error.message : "Internal server error.";
    const message =
      process.env.NODE_ENV === "development"
        ? rawMessage
        : "Internal server error.";

    return NextResponse.json(
      {
        type: "questions",
        message,
        error: message,
      },
      { status: 500 }
    );
  }
}
