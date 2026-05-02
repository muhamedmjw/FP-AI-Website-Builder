import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { generateGuestAIResponse } from "@/server/services/ai-service";
import { checkEthicalCompliance } from "@/server/services/ethics-service";
import { detectPromptLanguage } from "@/shared/utils/language-detection";
import { MAX_GUEST_PROMPTS, MAX_PROMPT_LENGTH } from "@/shared/constants/limits";
import { t } from "@/shared/constants/translations";
import type { AppLanguage } from "@/shared/types/database";

// Allow up to 60s for AI generation on Vercel (default is 10s which is too short).
export const maxDuration = 60;

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
 * Read the guest_usage row for the given token.
 * Returns null if no row exists yet.
 */
async function getGuestUsage(
  supabase: SupabaseClient,
  guestToken: string
) {
  const { data, error } = await supabase
    .from("guest_usage")
    .select("id, prompts_used_today, first_prompt_at, last_prompt_at")
    .eq("guest_token", guestToken)
    .maybeSingle();

  if (error) throw error;
  return data as {
    id: string;
    prompts_used_today: number;
    first_prompt_at: string;
    last_prompt_at: string;
  } | null;
}

const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function hasWindowExpired(firstPromptAt: string): boolean {
  const firstPromptTime = new Date(firstPromptAt).getTime();
  const now = Date.now();
  return now - firstPromptTime >= RATE_LIMIT_WINDOW_MS;
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
 * Uses rolling 24-hour window from first_prompt_at.
 */
async function incrementGuestUsage(
  supabase: SupabaseClient,
  guestToken: string
) {
  const existing = await getGuestUsage(supabase, guestToken);
  const now = new Date().toISOString();

  if (existing) {
    // Check if 24-hour window has expired
    // Handle migration: if first_prompt_at is null, use last_prompt_at or treat as new
    const windowStart = existing.first_prompt_at || existing.last_prompt_at;
    const windowExpired = windowStart ? hasWindowExpired(windowStart) : true;
    
    const { error } = await supabase
      .from("guest_usage")
      .update({
        prompts_used_today: windowExpired ? 1 : existing.prompts_used_today + 1,
        first_prompt_at: windowExpired ? now : (existing.first_prompt_at || now),
        last_prompt_at: now,
      })
      .eq("id", existing.id);

    if (error) throw error;
  } else {
    const { error } = await supabase.from("guest_usage").insert({
      guest_token: guestToken,
      prompts_used_today: 1,
      first_prompt_at: now,
      last_prompt_at: now,
    });

    if (error) throw error;
  }
}

/**
 * Get usage info for the current guest token, checking if 24-hour window has expired
 */
async function getGuestUsageInfo(
  supabase: SupabaseClient,
  guestToken: string
): Promise<{ promptsUsed: number; resetsAt: string } | null> {
  const existing = await getGuestUsage(supabase, guestToken);
  
  if (!existing) {
    return { promptsUsed: 0, resetsAt: "" };
  }

  // Handle migration: if first_prompt_at is null but last_prompt_at exists,
  // use last_prompt_at as the window start (for existing data)
  const windowStart = existing.first_prompt_at || existing.last_prompt_at;
  
  if (!windowStart) {
    // No window start time, treat as fresh
    return { promptsUsed: 0, resetsAt: "" };
  }

  const windowExpired = hasWindowExpired(windowStart);
  
  if (windowExpired) {
    // Window expired, reset counter
    return { promptsUsed: 0, resetsAt: "" };
  }

  // Calculate when the window resets (24 hours from window start)
  const windowStartTime = new Date(windowStart).getTime();
  const resetsAt = new Date(windowStartTime + RATE_LIMIT_WINDOW_MS).toISOString();

  return { promptsUsed: existing.prompts_used_today, resetsAt };
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

    // Check rate limit using rolling 24-hour window
    let usageTrackingAvailable = true;
    let promptsUsed = 0;
    let resetsAt = "";

    try {
      const usageInfo = await getGuestUsageInfo(serviceClient, guestToken);
      promptsUsed = usageInfo?.promptsUsed ?? 0;
      resetsAt = usageInfo?.resetsAt ?? "";
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

    // Ethical compliance check — refuse prohibited content for guests
    try {
      const ethicalStatus = await checkEthicalCompliance(content.trim());
      if (ethicalStatus === "lock" || ethicalStatus === "age_verification") {
        const promptLanguage = detectPromptLanguage(content.trim());
        return NextResponse.json({
          type: "questions",
          message: t("chatLockedAssistantMessage", promptLanguage),
        });
      }
    } catch (error) {
      // If the ethics check fails, let the request through rather than blocking
      console.error("POST /api/guest/chat ethics check failed; continuing.", error);
    }

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
        preferredLanguage,
        [],
        request.signal
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
        await incrementGuestUsage(serviceClient, guestToken);
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
