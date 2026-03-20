/**
 * AI Service - handles all communication with the OpenRouter API.
 * Uses Nemotron 3 Super free first, then falls back to Nemotron 3 Nano free.
 */

import OpenAI from "openai";
import { SupabaseClient } from "@supabase/supabase-js";
import { AppLanguage, HistoryMessage } from "@/shared/types/database";
import { AI_CONFIG, AI_MODELS } from "@/shared/constants/ai";
import {
  buildChatMessages,
  buildClassifierMessages,
  buildEditMessages,
  buildGenerationMessages,
} from "@/server/prompts/prompt-builder";

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

type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

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

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const PRIMARY_MODEL = process.env.OPENROUTER_MODEL_PRIMARY?.trim() || AI_MODELS.PRIMARY;
const FALLBACK_MODEL = process.env.OPENROUTER_MODEL_FALLBACK?.trim() || AI_MODELS.FALLBACK;
const MODEL_CANDIDATES = Array.from(new Set([PRIMARY_MODEL, FALLBACK_MODEL]));
const MODEL_NAME = PRIMARY_MODEL;

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

function looksLikeBadJson(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("```");
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

function parseAIResponse(raw: string): AIResponse {
  let cleaned = raw.trim();

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

    return {
      type: "questions",
      message: parsed.message ?? parsed.text ?? raw,
    };
  } catch {
    return {
      type: "questions",
      message: raw,
    };
  }
}

async function callModelOnce(
  model: string,
  messages: AIMessage[],
  maxTokens: number,
  temperature: number
): Promise<{
  parsed: AIResponse;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  modelUsed: string;
}> {
  const response = await openrouter.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  });

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

  const parsed = parseAIResponse(rawText);

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

async function callOpenRouterWithRetry(
  messages: AIMessage[],
  maxTokens: number,
  temperature: number
): Promise<{
  parsed: AIResponse;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  modelUsed: string;
}> {
  let lastError: Error | null = null;
  const modelsToTry = MODEL_CANDIDATES;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await callModelOnce(model, messages, maxTokens, temperature);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown AI error");

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

async function classifyIntent(
  userMessage: string,
  hasExistingWebsite: boolean
): Promise<{ intent: "build" | "edit" | "chat"; detectedLanguage: AppLanguage }> {
  const fallback: ClassifierResult = {
    intent: "build",
    detectedLanguage: "en",
  };

  const messages = buildClassifierMessages(userMessage) as AIMessage[];

  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await openrouter.chat.completions.create({
        model,
        messages,
        max_tokens: 60,
        temperature: 0.1,
      });

      const rawText =
        typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "";

      if (!rawText.trim()) {
        continue;
      }

      const parsed = parseClassifierResult(rawText);

      if (!parsed) {
        continue;
      }

      if (parsed.intent === "edit" && !hasExistingWebsite) {
        return {
          intent: "build",
          detectedLanguage: parsed.detectedLanguage,
        };
      }

      return parsed;
    } catch {
      continue;
    }
  }

  return fallback;
}

export async function generateAIResponse(
  supabase: SupabaseClient,
  chatId: string,
  history: HistoryMessage[],
  language: "en" | "ar" | "ku" = "en",
  existingHtml: string | null = null
): Promise<AIResponse> {
  const startTime = Date.now();

  const latestUserMessage =
    history.filter((m) => m.role === "user").at(-1)?.content ?? "";

  const { intent, detectedLanguage } = await classifyIntent(
    latestUserMessage,
    existingHtml !== null
  );

  let messages: AIMessage[];
  let maxTokens: number;
  let temperature: number;

  if (intent === "build") {
    messages = buildGenerationMessages(history, language, detectedLanguage) as AIMessage[];
    maxTokens = AI_CONFIG.MAX_TOKENS;
    temperature = 0.4;
  } else if (intent === "edit") {
    if (existingHtml && existingHtml.trim().length > 0) {
      messages = buildEditMessages(
        history,
        existingHtml,
        language,
        detectedLanguage
      ) as AIMessage[];
      maxTokens = AI_CONFIG.MAX_TOKENS;
      temperature = 0.2;
    } else {
      messages = buildGenerationMessages(history, language, detectedLanguage) as AIMessage[];
      maxTokens = AI_CONFIG.MAX_TOKENS;
      temperature = 0.4;
    }
  } else {
    messages = buildChatMessages(history, detectedLanguage) as AIMessage[];
    maxTokens = 300;
    temperature = 0.7;
  }

  try {
    let workerResult = await callOpenRouterWithRetry(
      messages,
      maxTokens,
      temperature
    );

    if (
      intent === "build" &&
      workerResult.parsed.type === "website" &&
      !validateWebsiteHtml(workerResult.parsed.html)
    ) {
      const firstResult = workerResult;

      try {
        workerResult = await callOpenRouterWithRetry(
          messages,
          maxTokens,
          temperature
        );
      } catch {
        workerResult = firstResult;
      }
    }

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

export async function generateGuestAIResponse(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  language: AppLanguage = "en"
): Promise<AIResponse> {
  const historyMessages: HistoryMessage[] = history.map((msg, i) => ({
    id: `guest-${i}`,
    chat_id: "guest-session",
    role: msg.role,
    content: msg.content,
    created_at: new Date().toISOString(),
  }));

  const latestUserMessage =
    historyMessages.filter((m) => m.role === "user").at(-1)?.content ?? "";

  const { intent, detectedLanguage } = await classifyIntent(latestUserMessage, false);

  let messages: AIMessage[];
  let maxTokens: number;
  let temperature: number;

  if (intent === "build") {
    messages = buildGenerationMessages(historyMessages, language, detectedLanguage) as AIMessage[];
    maxTokens = AI_CONFIG.MAX_TOKENS;
    temperature = 0.4;
  } else if (intent === "chat") {
    messages = buildChatMessages(historyMessages, detectedLanguage) as AIMessage[];
    maxTokens = 300;
    temperature = 0.7;
  } else {
    messages = buildGenerationMessages(historyMessages, language, detectedLanguage) as AIMessage[];
    maxTokens = AI_CONFIG.MAX_TOKENS;
    temperature = 0.4;
  }

  let workerResult = await callOpenRouterWithRetry(
    messages,
    maxTokens,
    temperature
  );

  if (
    intent === "build" &&
    workerResult.parsed.type === "website" &&
    !validateWebsiteHtml(workerResult.parsed.html)
  ) {
    const firstResult = workerResult;

    try {
      workerResult = await callOpenRouterWithRetry(
        messages,
        maxTokens,
        temperature
      );
    } catch {
      workerResult = firstResult;
    }
  }

  return workerResult.parsed;
}

function formatDefaultChatTitle(): string {
  const now = new Date();
  const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(now);
  const day = new Intl.DateTimeFormat("en-US", { day: "2-digit" }).format(now);

  return `New Website. ${month}, ${day}`;
}

function isLikelyGibberish(input: string): boolean {
  const value = input.trim();

  if (!value) {
    return true;
  }

  if (/^[\p{P}\p{S}\p{N}\s]+$/u.test(value)) {
    return true;
  }

  if (/^[A-Za-z]{1,4}$/u.test(value)) {
    return true;
  }

  if (
    /^[A-Za-z0-9]+[;:/\\|`~!@#$%^&*()_\-+=\[\]{}<>?,.][A-Za-z0-9;:/\\|`~!@#$%^&*()_\-+=\[\]{}<>?,.]*$/u.test(
      value
    ) &&
    !/\s/u.test(value)
  ) {
    return true;
  }

  const letters = value.match(/\p{L}/gu)?.length ?? 0;
  const nonWhitespace = value.replace(/\s/gu, "").length;

  if (letters === 0) {
    return true;
  }

  // Too many symbols/digits compared to letters is usually keyboard noise.
  if (letters / nonWhitespace < 0.45) {
    return true;
  }

  return false;
}

function isExpectedTitleLanguage(title: string, language: AppLanguage): boolean {
  if (!title.trim()) {
    return false;
  }

  const hasArabicScript = /\p{Script=Arabic}/u.test(title);
  const hasLatinScript = /\p{Script=Latin}/u.test(title);

  if (language === "en") {
    return hasLatinScript;
  }

  // Arabic and Kurdish Sorani both use Arabic script.
  return hasArabicScript;
}

function toTitleCaseEnglish(input: string): string {
  const keepLower = new Set(["a", "an", "and", "for", "in", "of", "on", "or", "the", "to", "with"]);

  return input
    .toLowerCase()
    .split(/\s+/u)
    .filter(Boolean)
    .map((word, index) => {
      if (index > 0 && keepLower.has(word)) {
        return word;
      }

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function buildHeuristicTitleFromMessage(
  userMessage: string,
  language: AppLanguage
): string | null {
  let source = userMessage
    .replace(/[\r\n\t]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  if (!source) {
    return null;
  }

  if (language === "en") {
    source = source
      .replace(
        /^(please\s+)?((can|could|would)\s+you\s+)?(make|build|create|generate|design|develop)\s+(me\s+)?(a|an|the)?\s*/iu,
        ""
      )
      .replace(/^(i\s+(need|want)\s+)(a|an|the)?\s*/iu, "")
      .replace(/^(website\s+for\s+)/iu, "")
      .trim();
  }

  const words = source
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 6);

  if (words.length === 0) {
    return null;
  }

  const baseTitle = words.join(" ").trim();

  if (!isExpectedTitleLanguage(baseTitle, language)) {
    return null;
  }

  return language === "en" ? toTitleCaseEnglish(baseTitle) : baseTitle;
}

export async function generateChatTitle(
  userMessage: string,
  preferredLanguage: AppLanguage = "en"
): Promise<string> {
  const trimmedMessage = userMessage.trim();
  const defaultTitle = formatDefaultChatTitle();
  const heuristicTitle = buildHeuristicTitleFromMessage(
    trimmedMessage,
    preferredLanguage
  );

  if (isLikelyGibberish(trimmedMessage)) {
    return defaultTitle;
  }

  const languageLabel =
    preferredLanguage === "ar"
      ? "Arabic"
      : preferredLanguage === "ku"
        ? "Kurdish Sorani"
        : "English";

  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await openrouter.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              `You are a title generator. Return ONLY one short descriptive title of 2 to 7 words for a website/chat. The title MUST be written in ${languageLabel}. Do not add quotes, explanations, prefixes, or extra text. If the user input is unclear or meaningless, return exactly: New Website.`,
          },
          { role: "user", content: trimmedMessage },
        ],
        max_tokens: 20,
        temperature: 0.5,
      });

      const rawTitle =
        typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "";

      if (!rawTitle) {
        continue;
      }

      const title = rawTitle
        .replace(/^[\"'`]+|[\"'`]+$/g, "")
        .replace(/[.!?،؛:]+$/u, "")
        .trim();

      const words = title.split(/\s+/u).filter(Boolean).slice(0, 6);
      const normalizedTitle = words.join(" ").trim();
      const lowerTitle = normalizedTitle.toLowerCase();

      if (
        !normalizedTitle ||
        normalizedTitle.length > 60 ||
        lowerTitle === "invalid user input" ||
        lowerTitle === "invalid input" ||
        lowerTitle === "new website" ||
        !isExpectedTitleLanguage(normalizedTitle, preferredLanguage)
      ) {
        continue;
      }

      return preferredLanguage === "en"
        ? toTitleCaseEnglish(normalizedTitle)
        : normalizedTitle;
    } catch {
      continue;
    }
  }

  return heuristicTitle ?? defaultTitle;
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
    console.error("Failed to log AI generation:", err);
  }
}
