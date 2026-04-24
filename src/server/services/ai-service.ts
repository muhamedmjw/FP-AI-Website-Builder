/**
 * AI Service — orchestrates AI generation for chat and guest sessions.
 * Uses DeepSeek V4 Flash (deepseek-v4-flash) first, then falls back to deepseek-reasoner.
 *
 * Lower-level concerns live in dedicated modules:
 * - ai-client.ts        → OpenAI client, retry loop, error helpers
 * - ai-response-parser.ts → response/classifier parsing, HTML validation
 * - chat-title-service.ts → chat title generation
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { AppLanguage, HistoryMessage } from "@/shared/types/database";
import { AI_CONFIG } from "@/shared/constants/ai";
import {
  buildChatMessages,
  buildClassifierMessages,
  buildEditMessages,
  buildGenerationMessages,
} from "@/server/prompts/prompt-builder";
import { detectLanguage } from "@/server/prompts/language-rules";
import { enrichHtmlWithStockImages } from "@/server/services/website-image-enrichment";
import {
  completeGeneration,
  logCancelledGeneration,
  registerGeneration,
} from "@/server/services/generation-manager";

// Re-export public symbols so existing imports keep working.
export { GenerationCancelledError } from "./ai-client";
export type { AIResponse, AIResponseQuestions, AIResponseWebsite, AIResponseEdit } from "./ai-response-parser";
export { generateChatTitle } from "./chat-title-service";

import {
  GenerationCancelledError,
  getDeepSeekClient,
  callDeepSeekWithRetry,
  MODEL_CANDIDATES,
  MODEL_NAME,
  type AIMessage,
} from "./ai-client";
import {
  type AIResponse,
  parseClassifierResult,
  validateWebsiteHtml,
  isAppLanguage,
  isClassifiedIntent,
} from "./ai-response-parser";

// ── Constants ──

const MAX_PROMPT_CHARS = 400_000;
const IMAGE_SEARCH_CONTEXT_MESSAGE_COUNT = 3;
const IMAGE_SEARCH_CONTEXT_MAX_CHARS = 280;
const CHAT_INTENT_MAX_TOKENS = 300;
const CHAT_INTENT_TEMPERATURE = 0.7;

// ── Internal types ──

type ClassifiedIntent = "build" | "edit" | "chat";

type IntentExecutionConfig = {
  messages: AIMessage[];
  maxTokens: number;
  temperature: number;
};

type GenerationPreparation = {
  intent: ClassifiedIntent;
  contentLanguage: AppLanguage;
  detectedLanguage: AppLanguage;
};

type GenerationLog = {
  chatId: string;
  modelName: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  status: "success" | "error";
  errorMessage?: string;
  durationMs: number;
};

// ── Image helpers ──

function buildImageSearchContext(history: HistoryMessage[]): string {
  return history
    .filter((message) => message.role === "user")
    .slice(-IMAGE_SEARCH_CONTEXT_MESSAGE_COUNT)
    .map((message) => message.content.replace(/[\r\n\t]+/gu, " "))
    .map((value) => value.replace(/\s+/gu, " ").trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, IMAGE_SEARCH_CONTEXT_MAX_CHARS);
}

async function enrichWebsiteHtmlImages(
  html: string,
  history: HistoryMessage[],
  abortSignal?: AbortSignal
): Promise<string> {
  const context = buildImageSearchContext(history);

  try {
    return await enrichHtmlWithStockImages(html, { context, abortSignal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    const errorMessage =
      error instanceof Error ? error.message : "Unknown stock image enrichment error";
    console.warn("Stock image enrichment failed:", errorMessage);
    return html;
  }
}

function injectUserImageDataUris(
  html: string,
  userImages: Array<{ fileName: string; dataUri: string }>
): string {
  let nextHtml = html;

  for (const image of userImages) {
    const pathVariants = [
      image.fileName,
      `./${image.fileName}`,
      `/${image.fileName}`,
    ];

    for (const variant of pathVariants) {
      const escapedVariant = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      nextHtml = nextHtml.replace(
        new RegExp(`src=["']${escapedVariant}["']`, "gi"),
        `src="${image.dataUri}"`
      );
    }
  }

  return nextHtml;
}

// ── Intent classification ──

async function classifyIntent(
  userMessage: string,
  hasExistingWebsite: boolean,
  websiteLanguage: AppLanguage,
  abortSignal?: AbortSignal
): Promise<{ intent: "build" | "edit" | "chat"; detectedLanguage: AppLanguage }> {
  const fallback = {
    intent: "build" as const,
    detectedLanguage: "en" as AppLanguage,
  };

  const messages = buildClassifierMessages(userMessage, websiteLanguage, hasExistingWebsite) as AIMessage[];

  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await getDeepSeekClient().chat.completions.create({
        model,
        messages,
        max_tokens: 1024,
        temperature: 0.1,
      }, { signal: abortSignal });

      const rawText =
        typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "";

      if (!rawText.trim()) continue;

      const parsed = parseClassifierResult(rawText);
      if (!parsed) continue;

      if (parsed.intent === "edit" && !hasExistingWebsite) {
        return {
          intent: "build",
          detectedLanguage: parsed.detectedLanguage,
        };
      }

      return parsed;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new GenerationCancelledError();
      }
      continue;
    }
  }

  return fallback;
}

// ── Generation config ──

function buildIntentExecutionConfig(
  intent: ClassifiedIntent,
  history: HistoryMessage[],
  contentLanguage: AppLanguage,
  detectedLanguage: AppLanguage,
  existingHtml: string | null,
  selectedUserImages: Array<{ fileName: string; dataUri: string }>
): IntentExecutionConfig {
  if (intent === "build") {
    return {
      messages: buildGenerationMessages(
        history,
        contentLanguage,
        detectedLanguage,
        selectedUserImages
      ) as AIMessage[],
      maxTokens: AI_CONFIG.MAX_TOKENS,
      temperature: 0.52,
    };
  }

  if (intent === "edit") {
    if (existingHtml && existingHtml.trim().length > 0) {
      return {
        messages: buildEditMessages(
          history,
          existingHtml,
          contentLanguage,
          detectedLanguage,
          selectedUserImages
        ) as AIMessage[],
        maxTokens: AI_CONFIG.MAX_TOKENS,
        temperature: 0.2,
      };
    }

    return {
      messages: buildGenerationMessages(
        history,
        contentLanguage,
        detectedLanguage,
        selectedUserImages
      ) as AIMessage[],
      maxTokens: AI_CONFIG.MAX_TOKENS,
      temperature: 0.52,
    };
  }

  return {
    messages: buildChatMessages(history, detectedLanguage, existingHtml) as AIMessage[],
    maxTokens: CHAT_INTENT_MAX_TOKENS,
    temperature: CHAT_INTENT_TEMPERATURE,
  };
}

async function prepareGeneration(
  history: HistoryMessage[],
  language: AppLanguage,
  existingHtml: string | null,
  abortSignal?: AbortSignal
): Promise<GenerationPreparation> {
  const latestUserMessage =
    history.filter((message) => message.role === "user").at(-1)?.content ?? "";

  const heuristicLanguage = detectLanguage(latestUserMessage);
  const promptContentLanguage: AppLanguage =
    heuristicLanguage === "sorani"
      ? "ku"
      : heuristicLanguage === "arabic"
        ? "ar"
        : "en";

  const { intent, detectedLanguage } = await classifyIntent(
    latestUserMessage,
    existingHtml !== null,
    promptContentLanguage,
    abortSignal
  );

  const contentLanguage: AppLanguage = detectedLanguage;

  return {
    intent,
    contentLanguage,
    detectedLanguage,
  };
}

function buildGenerationConfig(params: {
  preparation: GenerationPreparation;
  history: HistoryMessage[];
  existingHtml: string | null;
  userImages: Array<{ fileName: string; dataUri: string }>;
}): {
  effectiveUserImages: Array<{ fileName: string; dataUri: string }>;
  config: IntentExecutionConfig;
} {
  const { preparation, history, existingHtml, userImages } = params;

  return trimImagesToPromptLimit(
    preparation.intent,
    history,
    preparation.contentLanguage,
    preparation.detectedLanguage,
    existingHtml,
    userImages
  );
}

// ── Generation worker ──

async function runGenerationWorker(
  config: IntentExecutionConfig,
  history: HistoryMessage[],
  effectiveUserImages: Array<{ fileName: string; dataUri: string }>,
  abortSignal?: AbortSignal
): Promise<{
  parsed: AIResponse;
  modelUsed: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
}> {
  const workerResult = await callDeepSeekWithRetry(
    config.messages,
    config.maxTokens,
    config.temperature,
    abortSignal
  );

  const parsed = await enrichWebsiteResponse(
    workerResult.parsed,
    history,
    effectiveUserImages,
    abortSignal
  );

  return {
    parsed,
    modelUsed: workerResult.modelUsed,
    promptTokens: workerResult.promptTokens,
    completionTokens: workerResult.completionTokens,
    totalTokens: workerResult.totalTokens,
  };
}

function trimImagesToPromptLimit(
  intent: ClassifiedIntent,
  history: HistoryMessage[],
  contentLanguage: AppLanguage,
  detectedLanguage: AppLanguage,
  existingHtml: string | null,
  userImages: Array<{ fileName: string; dataUri: string }>
): {
  effectiveUserImages: Array<{ fileName: string; dataUri: string }>;
  config: IntentExecutionConfig;
} {
  let effectiveUserImages = userImages;
  let config = buildIntentExecutionConfig(
    intent,
    history,
    contentLanguage,
    detectedLanguage,
    existingHtml,
    effectiveUserImages
  );

  let totalPromptChars = config.messages.reduce(
    (sum, msg) => sum + (typeof msg.content === "string" ? msg.content.length : 0),
    0
  );

  // Remove older images first and keep newer ones when prompt size is too large.
  while (totalPromptChars > MAX_PROMPT_CHARS && effectiveUserImages.length > 0) {
    effectiveUserImages = effectiveUserImages.slice(1);
    config = buildIntentExecutionConfig(
      intent,
      history,
      contentLanguage,
      detectedLanguage,
      existingHtml,
      effectiveUserImages
    );
    totalPromptChars = config.messages.reduce(
      (sum, msg) => sum + (typeof msg.content === "string" ? msg.content.length : 0),
      0
    );
  }

  if (totalPromptChars > MAX_PROMPT_CHARS) {
    throw new Error(
      "Prompt is too large to process. Please shorten your request and try again."
    );
  }

  return {
    effectiveUserImages,
    config,
  };
}

async function enrichWebsiteResponse(
  parsed: AIResponse,
  history: HistoryMessage[],
  effectiveUserImages: Array<{ fileName: string; dataUri: string }>,
  abortSignal?: AbortSignal
): Promise<AIResponse> {
  if (parsed.type !== "website") {
    return parsed;
  }

  let enrichedHtml = await enrichWebsiteHtmlImages(parsed.html, history, abortSignal);
  
  if (abortSignal?.aborted) {
    throw new GenerationCancelledError();
  }

  enrichedHtml = injectUserImageDataUris(enrichedHtml, effectiveUserImages);
  const nextParsed: AIResponse = {
    ...parsed,
    html: enrichedHtml,
  };

  if (!validateWebsiteHtml(nextParsed.html)) {
    console.warn("AI returned potentially incomplete HTML — serving anyway.");
  }

  return nextParsed;
}

// ── Core generation (single attempt) ──

async function generateAIResponseOnce(
  supabase: SupabaseClient,
  chatId: string,
  history: HistoryMessage[],
  language: "en" | "ar" | "ku" = "en",
  existingHtml: string | null = null,
  userImages: Array<{ fileName: string; dataUri: string }> = [],
  abortSignal?: AbortSignal
): Promise<AIResponse> {
  const startTime = Date.now();

  if (abortSignal?.aborted) {
    throw new GenerationCancelledError();
  }

  const preparation = await prepareGeneration(history, language, existingHtml, abortSignal);

  if (abortSignal?.aborted) {
    throw new GenerationCancelledError();
  }


  try {
    const { effectiveUserImages, config } = buildGenerationConfig({
      preparation,
      history,
      existingHtml,
      userImages,
    });

    const workerResult = await runGenerationWorker(
      config,
      history,
      effectiveUserImages,
      abortSignal
    );

    const durationMs = Date.now() - startTime;

    await logGeneration(supabase, {
      chatId,
      modelName: workerResult.modelUsed,
      promptTokens: workerResult.promptTokens,
      completionTokens: workerResult.completionTokens,
      totalTokens: workerResult.totalTokens,
      status: "success",
      durationMs,
    });

    return workerResult.parsed;
  } catch (error) {
    if (error instanceof GenerationCancelledError || abortSignal?.aborted) {
      throw new GenerationCancelledError();
    }

    const durationMs = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown AI error";

    await logGeneration(supabase, {
      chatId,
      modelName: MODEL_NAME,
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

// ── Public: authenticated generation ──

/**
 * Generates an authenticated AI response for a chat and supports cancellation.
 */
export async function generateAIResponse(
  supabase: SupabaseClient,
  chatId: string,
  history: HistoryMessage[],
  language: "en" | "ar" | "ku" = "en",
  existingHtml: string | null = null,
  userImages: Array<{ fileName: string; dataUri: string }> = []
): Promise<AIResponse> {
  const abortController = new AbortController();
  registerGeneration(chatId, abortController);

  try {
    const result = await generateAIResponseWithAbort(
      supabase,
      chatId,
      history,
      language,
      existingHtml,
      userImages,
      abortController.signal
    );
    return result;
  } finally {
    completeGeneration(chatId);
  }
}

async function generateAIResponseWithAbort(
  supabase: SupabaseClient,
  chatId: string,
  history: HistoryMessage[],
  language: "en" | "ar" | "ku" = "en",
  existingHtml: string | null = null,
  userImages: Array<{ fileName: string; dataUri: string }> = [],
  abortSignal?: AbortSignal
): Promise<AIResponse> {
  try {
    return await generateAIResponseOnce(
      supabase,
      chatId,
      history,
      language,
      existingHtml,
      userImages,
      abortSignal
    );
  } catch (error) {
    if (error instanceof GenerationCancelledError || abortSignal?.aborted) {
      await logCancelledGeneration(supabase, chatId, MODEL_NAME);
      throw new GenerationCancelledError();
    }

    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const shouldRetryWithoutImages =
      userImages.length > 0 &&
      (
        message.includes("context length") ||
        message.includes("maximum") ||
        message.includes("prompt is too large")
      );

    if (!shouldRetryWithoutImages) {
      throw error;
    }

    console.warn(
      "AI generation failed with user images due to context/maximum limits; retrying without user images.",
      { chatId, imageCount: userImages.length }
    );

    return generateAIResponseOnce(
      supabase,
      chatId,
      history,
      language,
      existingHtml,
      [],
      abortSignal
    );
  }
}

// ── Public: guest generation ──

/**
 * Generates an AI response for guest mode without persisting generation state.
 */
export async function generateGuestAIResponse(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  language: AppLanguage = "en",
  userImages: Array<{ fileName: string; dataUri: string }> = []
): Promise<AIResponse> {
  try {
    const historyMessages: HistoryMessage[] = history.map((msg, i) => ({
      id: `guest-${i}`,
      chat_id: "guest-session",
      role: msg.role,
      content: msg.content,
      created_at: new Date().toISOString(),
    }));

    const preparation = await prepareGeneration(historyMessages, language, null);
    const config = buildIntentExecutionConfig(
      preparation.intent,
      historyMessages,
      preparation.contentLanguage,
      preparation.detectedLanguage,
      null,
      userImages
    );

    const workerResult = await callDeepSeekWithRetry(
      config.messages,
      config.maxTokens,
      config.temperature
    );

    let parsed = workerResult.parsed;

    if (parsed.type === "website") {
      let enrichedHtml = await enrichWebsiteHtmlImages(parsed.html, historyMessages);
      enrichedHtml = injectUserImageDataUris(enrichedHtml, userImages);
      parsed = {
        ...parsed,
        html: enrichedHtml,
      };

      if (!validateWebsiteHtml(parsed.html)) {
        console.warn("AI returned potentially incomplete HTML — serving anyway.");
      }
    }

    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown guest AI error.";
    throw new Error(`Guest AI generation failed: ${message}`);
  }
}

// ── Logging ──

async function logGeneration(
  supabase: SupabaseClient,
  log: GenerationLog
): Promise<void> {
  try {
    await supabase.from("ai_generations").insert({
      chat_id: log.chatId,
      model_name: log.modelName,
      prompt_tokens: log.promptTokens,
      completion_tokens: log.completionTokens,
      total_tokens: log.totalTokens,
      status: log.status,
      error_message: log.errorMessage ?? null,
      duration_ms: log.durationMs,
    });
  } catch (err) {
    console.error("Failed to log AI generation:", err);
  }
}
