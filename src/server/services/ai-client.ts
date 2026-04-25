/**
 * AI Client — manages the DeepSeek OpenAI-compatible client, model
 * constants, and the retry-with-fallback loop.
 */

import OpenAI from "openai";
import { AI_MODELS } from "@/shared/constants/ai";

// ── Types ──

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

// ── Client singleton ──

let deepseekClient: OpenAI | null = null;

export function getDeepSeekClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim() ?? "";

  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is required for AI generation.");
  }

  if (!deepseekClient) {
    deepseekClient = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey,
    });
  }

  return deepseekClient;
}

// ── Model configuration ──

export const PRIMARY_MODEL = process.env.DEEPSEEK_MODEL_PRIMARY?.trim() || AI_MODELS.PRIMARY;
export const FALLBACK_MODEL = process.env.DEEPSEEK_MODEL_FALLBACK?.trim() || AI_MODELS.FALLBACK;
export const MODEL_CANDIDATES = Array.from(new Set([PRIMARY_MODEL, FALLBACK_MODEL]));
export const MODEL_NAME = PRIMARY_MODEL;

// ── Retry constants ──

const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 2000];
const DEEPSEEK_MAX_OUTPUT_TOKENS = 65536;

// ── Error helpers ──

export function getErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }

  if (typeof error === "string") {
    return error.toLowerCase();
  }

  return "";
}

export function isNonRetriableModelError(error: unknown): boolean {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error);

  if (status === 400 || status === 401 || status === 403) {
    return true;
  }

  return (
    message.includes("invalid max_tokens") ||
    message.includes("valid range of max_tokens") ||
    message.includes("max_tokens value")
  );
}

// ── Generation cancelled error ──

export class GenerationCancelledError extends Error {
  constructor() {
    super("Generation cancelled by user");
    this.name = "GenerationCancelledError";
  }
}

// ── Core API call ──

import type { AIResponse } from "./ai-response-parser";
import { parseAIResponse, looksLikeBadJson } from "./ai-response-parser";
import type { AppLanguage } from "@/shared/types/database";

export async function callModelOnce(
  model: string,
  messages: AIMessage[],
  maxTokens: number,
  temperature: number,
  abortSignal?: AbortSignal,
  language?: AppLanguage
): Promise<{
  parsed: AIResponse;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  modelUsed: string;
}> {
  const effectiveMaxTokens = model.includes("deepseek")
    ? Math.min(maxTokens, DEEPSEEK_MAX_OUTPUT_TOKENS)
    : maxTokens;

  const response = await getDeepSeekClient().chat.completions.create(
    {
      model,
      messages,
      max_tokens: effectiveMaxTokens,
      temperature,
    },
    { signal: abortSignal }
  );

  const rawText =
    typeof response.choices[0]?.message?.content === "string"
      ? response.choices[0].message.content
      : "";

  const promptTokens = response.usage?.prompt_tokens ?? null;
  const completionTokens = response.usage?.completion_tokens ?? null;
  const totalTokens = response.usage?.total_tokens ?? null;

  if (!rawText.trim()) {
    throw new Error(`Empty response from model: ${model}`);
  }

  const parsed = parseAIResponse(rawText, language);

  if (
    parsed.type === "questions" &&
    parsed.message === rawText &&
    looksLikeBadJson(rawText)
  ) {
    throw new Error(`Malformed JSON from model: ${model}`);
  }

  return {
    parsed,
    promptTokens,
    completionTokens,
    totalTokens,
    modelUsed: model,
  };
}

// ── Retry loop ──

export async function callDeepSeekWithRetry(
  messages: AIMessage[],
  maxTokens: number,
  temperature: number,
  abortSignal?: AbortSignal,
  language?: AppLanguage
): Promise<{
  parsed: AIResponse;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  modelUsed: string;
}> {
  let lastError: Error | null = null;
  const modelsToTry = MODEL_CANDIDATES;

  if (abortSignal?.aborted) {
    throw new GenerationCancelledError();
  }

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await callModelOnce(model, messages, maxTokens, temperature, abortSignal, language);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown AI error");

        if (error instanceof GenerationCancelledError || abortSignal?.aborted) {
          throw new GenerationCancelledError();
        }

        if (isNonRetriableModelError(error)) {
          break;
        }

        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_DELAYS[attempt])
          );
          continue;
        }
      }
    }
  }

  throw lastError ?? new Error("AI generation failed after retries.");
}
