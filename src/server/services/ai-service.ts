/**
 * AI Service - handles all communication with the Groq API.
 *
 * Responsibilities:
 * - Classify the latest user intent (build/edit/chat)
 * - Build intent-specific prompt messages
 * - Call Groq via the groq-sdk (OpenAI-compatible)
 * - Parse the JSON response ({ type: 'website', html: '...' } | { type: 'questions', message: '...' })
 * - Log each worker API call to the ai_generations table
 */

import Groq from "groq-sdk";
import { SupabaseClient } from "@supabase/supabase-js";
import { AppLanguage, HistoryMessage } from "@/shared/types/database";
import { AI_MODELS, AI_CONFIG } from "@/shared/constants/ai";
import {
  buildChatMessages,
  buildClassifierMessages,
  buildEditMessages,
  buildGenerationMessages,
} from "@/server/prompts/prompt-builder";

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

type ClassifiedIntent = "build" | "edit" | "chat";

type ClassifierResult = {
  intent: ClassifiedIntent;
  detectedLanguage: AppLanguage;
};

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
const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 2000];

function isAppLanguage(value: unknown): value is AppLanguage {
  return value === "en" || value === "ar" || value === "ku";
}

function isClassifiedIntent(value: unknown): value is ClassifiedIntent {
  return value === "build" || value === "edit" || value === "chat";
}

function stripCodeFences(raw: string): string {
  const cleaned = raw.trim();
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  return cleaned;
}

function parseClassifierResult(raw: string): ClassifierResult | null {
  try {
    const parsed = JSON.parse(stripCodeFences(raw));

    const intent = isClassifiedIntent(parsed?.intent) ? parsed.intent : null;
    const detectedLanguageValue = parsed?.detectedLanguage ?? parsed?.language;
    const detectedLanguage = isAppLanguage(detectedLanguageValue)
      ? detectedLanguageValue
      : null;

    if (!intent || !detectedLanguage) {
      return null;
    }

    return {
      intent,
      detectedLanguage,
    };
  } catch {
    return null;
  }
}

async function classifyIntent(
  userMessage: string,
  hasExistingWebsite: boolean
): Promise<{ intent: "build" | "edit" | "chat"; detectedLanguage: AppLanguage }> {
  const fallback: ClassifierResult = {
    intent: "build",
    detectedLanguage: "en",
  };

  try {
    const response = await groq.chat.completions.create({
      model: AI_MODELS.PRIMARY,
      messages: buildClassifierMessages(userMessage),
      max_tokens: 60,
      temperature: 0.1,
    });

    const rawText = response.choices[0]?.message?.content ?? "";
    const parsed = parseClassifierResult(rawText);

    if (!parsed) {
      return fallback;
    }

    if (parsed.intent === "edit" && !hasExistingWebsite) {
      return {
        intent: "build",
        detectedLanguage: parsed.detectedLanguage,
      };
    }

    return parsed;
  } catch {
    return fallback;
  }
}

function validateWebsiteHtml(html: string): boolean {
  const required = [
    "<nav",
    'class="hero"',
    "<footer",
    'class="btn btn-primary"',
    "</html>",
  ];

  return required.every((token) => html.includes(token));
}

/**
 * Call Groq with retry logic. Retries up to MAX_RETRIES times with
 * exponential backoff if JSON parsing fails or the response is empty.
 */
async function callGroqWithRetry(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  modelName: string,
  max_tokens: number,
  temperature: number
): Promise<{ parsed: AIResponse; promptTokens: number | null; completionTokens: number | null; totalTokens: number | null }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await groq.chat.completions.create({
      model: modelName,
      messages,
      max_tokens,
      temperature,
    });

    const rawText = response.choices[0]?.message?.content ?? "";
    const promptTokens = response.usage?.prompt_tokens ?? null;
    const completionTokens = response.usage?.completion_tokens ?? null;
    const totalTokens = response.usage?.total_tokens ?? null;

    // If the response is empty, retry
    if (!rawText.trim()) {
      lastError = new Error("AI returned an empty response.");
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
        continue;
      }
      break;
    }

    const parsed = parseAIResponse(rawText);

    // If the response parsed as raw text fallback (JSON was malformed), retry
    if (parsed.type === "questions" && parsed.message === rawText && looksLikeBadJson(rawText)) {
      lastError = new Error("AI returned malformed JSON.");
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
        continue;
      }
    }

    return { parsed, promptTokens, completionTokens, totalTokens };
  }

  throw lastError ?? new Error("AI generation failed after retries.");
}

/**
 * Check if raw text looks like it was supposed to be JSON but failed to parse.
 */
function looksLikeBadJson(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("```");
}

export async function generateAIResponse(
  supabase: SupabaseClient,
  chatId: string,
  history: HistoryMessage[],
  language: "en" | "ar" | "ku" = "en",
  existingHtml: string | null = null
): Promise<AIResponse> {
  const startTime = Date.now();
  const modelName = AI_MODELS.PRIMARY;

  const latestUserMessage = history.filter((m) => m.role === "user").at(-1)?.content ?? "";

  const { intent, detectedLanguage } = await classifyIntent(
    latestUserMessage,
    existingHtml !== null
  );

  let messages: { role: "system" | "user" | "assistant"; content: string }[];
  let maxTokens: number;
  let temperature: number;

  if (intent === "build") {
    messages = buildGenerationMessages(history, language, detectedLanguage);
    maxTokens = AI_CONFIG.MAX_TOKENS;
    temperature = 0.4;
  } else if (intent === "edit") {
    if (existingHtml && existingHtml.trim().length > 0) {
      messages = buildEditMessages(history, existingHtml, language, detectedLanguage);
      maxTokens = AI_CONFIG.MAX_TOKENS;
      temperature = 0.2;
    } else {
      messages = buildGenerationMessages(history, language, detectedLanguage);
      maxTokens = AI_CONFIG.MAX_TOKENS;
      temperature = 0.4;
    }
  } else {
    messages = buildChatMessages(history, detectedLanguage);
    maxTokens = 300;
    temperature = 0.7;
  }

  try {
    let workerResult = await callGroqWithRetry(
      messages,
      modelName,
      maxTokens,
      temperature
    );

    if (intent === "build" && workerResult.parsed.type === "website" && !validateWebsiteHtml(workerResult.parsed.html)) {
      console.warn("Build response failed HTML validation. Retrying generation once.");

      const firstResult = workerResult;
      try {
        workerResult = await callGroqWithRetry(
          messages,
          modelName,
          maxTokens,
          temperature
        );

        if (workerResult.parsed.type === "website" && !validateWebsiteHtml(workerResult.parsed.html)) {
          console.warn("Build response failed HTML validation after retry. Returning anyway.");
        }
      } catch (retryError) {
        console.warn("Build retry failed after validation warning. Returning first response.", retryError);
        workerResult = firstResult;
      }
    }

    const durationMs = Date.now() - startTime;

    // Log to ai_generations table
    await logGeneration(supabase, {
      chatId,
      modelName,
      promptTokens: workerResult.promptTokens,
      completionTokens: workerResult.completionTokens,
      totalTokens: workerResult.totalTokens,
      status: "success",
      durationMs,
    });

    return workerResult.parsed;
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
  const trimmedMessage = userMessage.trim();

  if (!trimmedMessage) {
    return "New Website";
  }

  // Fast local fallback for very short or obviously noisy single-token English input.
  if (/^[A-Za-z]{1,4}$/.test(trimmedMessage)) {
    return "New Website";
  }

  if (
    /^[A-Za-z0-9]+[;:/\\|`~!@#$%^&*()_\-+=\[\]{}<>?,.][A-Za-z0-9;:/\\|`~!@#$%^&*()_\-+=\[\]{}<>?,.]*$/.test(
      trimmedMessage
    ) &&
    !/\s/.test(trimmedMessage)
  ) {
    return "New Website";
  }

  try {
    const response = await groq.chat.completions.create({
      model: AI_MODELS.PRIMARY,
      messages: [
        {
          role: "system",
          content:
            "You are a title generator. Given the user's message, respond with ONLY a short title (3-6 words) summarizing what website they want to build. IMPORTANT RULES: Write the title in the SAME language as the user's message. If the message is in Arabic, write the title in Arabic. If the message is in Kurdish Sorani, write the title in Kurdish Sorani. If the message is in English, write the title in English. If the input is gibberish, random characters, too short to understand, or makes no sense, return exactly: New Website. No quotes, no punctuation at the end, no extra text, just the title.",
        },
        { role: "user", content: trimmedMessage },
      ],
      max_tokens: 20,
      temperature: 0.5,
    });

    const rawTitle = response.choices[0]?.message?.content?.trim() ?? "";
    const title = rawTitle
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/[.!?،؛:]+$/u, "")
      .trim();
    const lowerTitle = title.toLowerCase();
    const words = title.split(/\s+/u).filter(Boolean);

    if (
      !title ||
      title.length > 60 ||
      words.length > 6 ||
      lowerTitle === "invalid user input" ||
      lowerTitle === "invalid input"
    ) {
      return "New Website";
    }

    return title;
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

/**
 * Generate an AI response for guest users (no Supabase auth, no logging).
 * Accepts a simple conversation history array.
 */
export async function generateGuestAIResponse(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  language: AppLanguage = "en"
): Promise<AIResponse> {
  const modelName = AI_MODELS.PRIMARY;

  const historyMessages: HistoryMessage[] = history.map((msg, i) => ({
    id: `guest-${i}`,
    chat_id: "guest-session",
    role: msg.role,
    content: msg.content,
    created_at: new Date().toISOString(),
  }));

  const latestUserMessage = historyMessages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const { intent, detectedLanguage } = await classifyIntent(latestUserMessage, false);

  let messages: { role: "system" | "user" | "assistant"; content: string }[];
  let maxTokens: number;
  let temperature: number;

  if (intent === "build") {
    messages = buildGenerationMessages(historyMessages, language, detectedLanguage);
    maxTokens = AI_CONFIG.MAX_TOKENS;
    temperature = 0.4;
  } else if (intent === "chat") {
    messages = buildChatMessages(historyMessages, detectedLanguage);
    maxTokens = 300;
    temperature = 0.7;
  } else {
    // Guest mode has no persisted website HTML, so edit intent falls back to build.
    messages = buildGenerationMessages(historyMessages, language, detectedLanguage);
    maxTokens = AI_CONFIG.MAX_TOKENS;
    temperature = 0.4;
  }

  let workerResult = await callGroqWithRetry(
    messages,
    modelName,
    maxTokens,
    temperature
  );

  if (intent === "build" && workerResult.parsed.type === "website" && !validateWebsiteHtml(workerResult.parsed.html)) {
    console.warn("Guest build response failed HTML validation. Retrying generation once.");

    const firstResult = workerResult;
    try {
      workerResult = await callGroqWithRetry(
        messages,
        modelName,
        maxTokens,
        temperature
      );

      if (workerResult.parsed.type === "website" && !validateWebsiteHtml(workerResult.parsed.html)) {
        console.warn("Guest build response failed HTML validation after retry. Returning anyway.");
      }
    } catch (retryError) {
      console.warn("Guest build retry failed after validation warning. Returning first response.", retryError);
      workerResult = firstResult;
    }
  }

  return workerResult.parsed;
}
