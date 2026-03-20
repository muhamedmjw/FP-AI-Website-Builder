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
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
  guestToken: string,
  today: string
) {
  const { data, error } = await supabase
    .from("guest_usage")
    .select("*")
    .eq("guest_token", guestToken)
    .eq("usage_date", today)
    .maybeSingle();

  if (error) throw error;
  return data as { id: string; prompts_used_today: number } | null;
}

/**
 * Increment (or create) the guest_usage row after a successful AI response.
 */
async function incrementGuestUsage(
  supabase: SupabaseClient,
  guestToken: string,
  today: string
) {
  const existing = await getGuestUsage(supabase, guestToken, today);

  if (existing) {
    const { error } = await supabase
      .from("guest_usage")
      .update({
        prompts_used_today: existing.prompts_used_today + 1,
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
        { error: "content is required." },
        { status: 400 }
      );
    }

    if (content.trim().length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: "Prompt too long." },
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

    // Check rate limit
    const usage = await getGuestUsage(serviceClient, guestToken, today);
    const promptsUsed = usage?.prompts_used_today ?? 0;

    if (promptsUsed >= MAX_GUEST_PROMPTS) {
      return NextResponse.json(
        { error: "Guest limit reached. Create a free account to continue." },
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

    // Call the AI
    const aiResponse = await generateGuestAIResponse(
      conversationHistory,
      preferredLanguage
    );

    // Increment usage after successful response
    await incrementGuestUsage(serviceClient, guestToken, today);

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
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
