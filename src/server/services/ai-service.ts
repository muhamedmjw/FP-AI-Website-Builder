/**
 * AI Service — handles all communication with the Groq API.
 *
 * Responsibilities:
 * - Build the messages array (system prompt + conversation history)
 * - Call Groq via the groq-sdk (OpenAI-compatible)
 * - Parse the JSON response ({ type: 'website', html: '...' } | { type: 'questions', message: '...' })
 * - Log each API call to the ai_generations table
 */

import Groq from "groq-sdk";
import { SupabaseClient } from "@supabase/supabase-js";
import { HistoryMessage } from "@/shared/types/database";
import { AI_MODELS, AI_CONFIG } from "@/shared/constants/ai";
import { buildMessages } from "@/server/prompts/prompt-builder";

// --- Types ---

export type AIResponseQuestions = {
  type: "questions";
  message: string;
};

export type AIResponseWebsite = {
  type: "website";
  html: string;
  message: string;
};

export type AIResponse = AIResponseQuestions | AIResponseWebsite;

// --- Groq Client ---

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// --- Main function ---

/**
 * Send the conversation to Groq and get a parsed AI response.
 *
 * @param supabase  - Authenticated Supabase client (for logging to ai_generations)
 * @param chatId    - The chat ID (for logging)
 * @param history   - Full message history from DB (already includes the latest user message)
 * @param language  - Website language preference
 * @returns Parsed AI response with type, message, and optionally html
 */
export async function generateAIResponse(
  supabase: SupabaseClient,
  chatId: string,
  history: HistoryMessage[],
  language: "en" | "ar" | "ku" = "en"
): Promise<AIResponse> {
  const startTime = Date.now();
  const modelName = AI_MODELS.PRIMARY;

  // Build the conversation
  const messages = buildMessages(history, language);

  try {
    // Call Groq
    const response = await groq.chat.completions.create({
      model: modelName,
      messages,
      max_tokens: AI_CONFIG.MAX_TOKENS,
      temperature: AI_CONFIG.TEMPERATURE,
    });

    const rawText = response.choices[0]?.message?.content ?? "";
    const durationMs = Date.now() - startTime;

    // Parse token usage from response
    const promptTokens = response.usage?.prompt_tokens ?? null;
    const completionTokens = response.usage?.completion_tokens ?? null;
    const totalTokens = response.usage?.total_tokens ?? null;

    // Parse the JSON response
    const parsed = parseAIResponse(rawText);

    // Log to ai_generations table
    await logGeneration(supabase, {
      chatId,
      modelName,
      promptTokens,
      completionTokens,
      totalTokens,
      status: "success",
      durationMs,
    });

    return parsed;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown AI error";

    // Log the failed generation
    await logGeneration(supabase, {
      chatId,
      modelName,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      status: "error",
      errorMessage,
      durationMs,
    });

    throw new Error(`AI generation failed: ${errorMessage}`);
  }
}

// --- Response parser ---

/**
 * Parse the raw AI text into a structured AIResponse.
 * Handles cases where the AI wraps JSON in markdown code fences.
 */
function parseAIResponse(raw: string): AIResponse {
  let cleaned = raw.trim();

  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(cleaned);

    if (parsed.type === "website" && typeof parsed.html === "string") {
      return {
        type: "website",
        html: parsed.html,
        message: parsed.message ?? "Website generated successfully.",
      };
    }

    if (parsed.type === "questions" && typeof parsed.message === "string") {
      return {
        type: "questions",
        message: parsed.message,
      };
    }

    // If it's valid JSON but wrong shape, treat as a text message
    return {
      type: "questions",
      message: parsed.message ?? parsed.text ?? raw,
    };
  } catch {
    // If JSON parsing fails entirely, return the raw text as a message
    return {
      type: "questions",
      message: raw,
    };
  }
}

// --- Logging ---

type GenerationLog = {
  chatId: string;
  historyId?: string;
  modelName: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  status: "success" | "error";
  errorMessage?: string;
  durationMs: number;
};

/**
 * Generate a short chat title (3-6 words) from the user's first message.
 * Runs a small fast completion — no logging needed.
 */
export async function generateChatTitle(userMessage: string): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model: AI_MODELS.PRIMARY,
      messages: [
        {
          role: "system",
          content:
            "You are a title generator. Given the user's message, respond with ONLY a short title (3-6 words) that summarizes what website they want. No quotes, no punctuation at the end, no extra text.",
        },
        { role: "user", content: userMessage },
      ],
      max_tokens: 20,
      temperature: 0.5,
    });

    const title = response.choices[0]?.message?.content?.trim();
    return title && title.length > 0 && title.length <= 60
      ? title
      : "New Website";
  } catch {
    return "New Website";
  }
}

async function logGeneration(
  supabase: SupabaseClient,
  log: GenerationLog
): Promise<void> {
  try {
    await supabase.from("ai_generations").insert({
      chat_id: log.chatId,
      history_id: log.historyId ?? null,
      model_name: log.modelName,
      prompt_tokens: log.promptTokens,
      completion_tokens: log.completionTokens,
      total_tokens: log.totalTokens,
      status: log.status,
      error_message: log.errorMessage ?? null,
      duration_ms: log.durationMs,
    });
  } catch (err) {
    // Don't fail the request if logging fails
    console.error("Failed to log AI generation:", err);
  }
}
