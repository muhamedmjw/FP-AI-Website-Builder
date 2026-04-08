/**
 * AI Service - handles all communication with the DeepSeek official API.
 * Uses DeepSeek V3.2 (deepseek-chat) first, then falls back to deepseek-reasoner.
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
import { enrichHtmlWithBraveImages } from "@/server/services/brave-image-service";

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

let deepseekClient: OpenAI | null = null;

function getDeepSeekClient(): OpenAI {
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

const PRIMARY_MODEL = process.env.DEEPSEEK_MODEL_PRIMARY?.trim() || AI_MODELS.PRIMARY;
const FALLBACK_MODEL = process.env.DEEPSEEK_MODEL_FALLBACK?.trim() || AI_MODELS.FALLBACK;
const MODEL_CANDIDATES = Array.from(new Set([PRIMARY_MODEL, FALLBACK_MODEL]));
const MODEL_NAME = PRIMARY_MODEL;

const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 2000];
const MAX_PROMPT_CHARS = 400_000;

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
  if (!html || html.trim().length < 500) return false;

  const hasDoctype = /<html[\s>]/i.test(html);
  const hasClosingHtml = /<\/html>/i.test(html);
  const hasBody = /<body[\s>]/i.test(html) && /<\/body>/i.test(html);
  const hasHead = /<head[\s>]/i.test(html);
  const hasSomeContent =
    /<(div|section|main|article|header|nav|footer|h1|h2|p)[^>]*>/i.test(html);

  return hasDoctype && hasClosingHtml && hasBody && hasHead && hasSomeContent;
}

function buildImageSearchContext(history: HistoryMessage[]): string {
  return history
    .filter((message) => message.role === "user")
    .slice(-3)
    .map((message) => message.content.replace(/[\r\n\t]+/gu, " "))
    .map((value) => value.replace(/\s+/gu, " ").trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 280);
}

async function enrichWebsiteHtmlImages(
  html: string,
  history: HistoryMessage[]
): Promise<string> {
  const context = buildImageSearchContext(history);

  if (!context) {
    return html;
  }

  try {
    return await enrichHtmlWithBraveImages(html, { context });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Brave image error";
    console.warn("Brave image enrichment failed:", errorMessage);
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
  // deepseek-reasoner has a hard cap of 8192 max_tokens
  const effectiveMaxTokens = model.includes("reasoner")
    ? Math.min(maxTokens, 8192)
    : maxTokens;

  const response = await getDeepSeekClient().chat.completions.create({
    model,
    messages,
    max_tokens: effectiveMaxTokens,
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

async function callDeepSeekWithRetry(
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
  hasExistingWebsite: boolean,
  websiteLanguage: AppLanguage
): Promise<{ intent: "build" | "edit" | "chat"; detectedLanguage: AppLanguage }> {
  const fallback: ClassifierResult = {
    intent: "build",
    detectedLanguage: "en",
  };

  const messages = buildClassifierMessages(userMessage, websiteLanguage) as AIMessage[];

  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await getDeepSeekClient().chat.completions.create({
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

async function generateAIResponseOnce(
  supabase: SupabaseClient,
  chatId: string,
  history: HistoryMessage[],
  language: "en" | "ar" | "ku" = "en",
  existingHtml: string | null = null,
  userImages: Array<{ fileName: string; dataUri: string }> = []
): Promise<AIResponse> {
  const startTime = Date.now();

  const latestUserMessage =
    history.filter((m) => m.role === "user").at(-1)?.content ?? "";

  const { intent, detectedLanguage } = await classifyIntent(
    latestUserMessage,
    existingHtml !== null,
    language
  );

  const buildMessagesForIntent = (
    selectedUserImages: Array<{ fileName: string; dataUri: string }>
  ): { messages: AIMessage[]; maxTokens: number; temperature: number } => {
    if (intent === "build") {
      return {
        messages: buildGenerationMessages(
          history,
          language,
          detectedLanguage,
          selectedUserImages
        ) as AIMessage[],
        maxTokens: AI_CONFIG.MAX_TOKENS,
        temperature: 0.4,
      };
    }

    if (intent === "edit") {
      if (existingHtml && existingHtml.trim().length > 0) {
        return {
          messages: buildEditMessages(
            history,
            existingHtml,
            language,
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
          language,
          detectedLanguage,
          selectedUserImages
        ) as AIMessage[],
        maxTokens: AI_CONFIG.MAX_TOKENS,
        temperature: 0.4,
      };
    }

    return {
      messages: buildChatMessages(history, detectedLanguage) as AIMessage[],
      maxTokens: 300,
      temperature: 0.7,
    };
  };

  let effectiveUserImages = userImages;
  let messages: AIMessage[];
  let maxTokens: number;
  let temperature: number;

  ({ messages, maxTokens, temperature } = buildMessagesForIntent(effectiveUserImages));

  try {
    let totalPromptChars = messages.reduce(
      (sum, msg) => sum + (typeof msg.content === "string" ? msg.content.length : 0),
      0
    );

    // Keep the most recent images by removing older ones from the front if prompt grows too large.
    while (totalPromptChars > MAX_PROMPT_CHARS && effectiveUserImages.length > 0) {
      effectiveUserImages = effectiveUserImages.slice(1);
      ({ messages, maxTokens, temperature } = buildMessagesForIntent(effectiveUserImages));
      totalPromptChars = messages.reduce(
        (sum, msg) => sum + (typeof msg.content === "string" ? msg.content.length : 0),
        0
      );
    }

    if (totalPromptChars > MAX_PROMPT_CHARS) {
      throw new Error(
        "Prompt is too large to process. Please shorten your request and try again."
      );
    }

    const workerResult = await callDeepSeekWithRetry(
      messages,
      maxTokens,
      temperature
    );

    let parsed = workerResult.parsed;

    if (parsed.type === "website") {
      let enrichedHtml = await enrichWebsiteHtmlImages(parsed.html, history);
      enrichedHtml = injectUserImageDataUris(enrichedHtml, effectiveUserImages);
      parsed = {
        ...parsed,
        html: enrichedHtml,
      };

      if (!validateWebsiteHtml(parsed.html)) {
        console.warn("AI returned potentially incomplete HTML — serving anyway.");
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

    return parsed;
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

export async function generateAIResponse(
  supabase: SupabaseClient,
  chatId: string,
  history: HistoryMessage[],
  language: "en" | "ar" | "ku" = "en",
  existingHtml: string | null = null,
  userImages: Array<{ fileName: string; dataUri: string }> = []
): Promise<AIResponse> {
  try {
    return await generateAIResponseOnce(
      supabase,
      chatId,
      history,
      language,
      existingHtml,
      userImages
    );
  } catch (error) {
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
      []
    );
  }
}

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

    const latestUserMessage =
      historyMessages.filter((m) => m.role === "user").at(-1)?.content ?? "";

    const { intent, detectedLanguage } = await classifyIntent(
      latestUserMessage,
      false,
      language
    );

    let messages: AIMessage[];
    let maxTokens: number;
    let temperature: number;

    if (intent === "build") {
      messages = buildGenerationMessages(
        historyMessages,
        language,
        detectedLanguage,
        userImages
      ) as AIMessage[];
      maxTokens = AI_CONFIG.MAX_TOKENS;
      temperature = 0.4;
    } else if (intent === "chat") {
      messages = buildChatMessages(historyMessages, detectedLanguage) as AIMessage[];
      maxTokens = 300;
      temperature = 0.7;
    } else {
      messages = buildGenerationMessages(
        historyMessages,
        language,
        detectedLanguage,
        userImages
      ) as AIMessage[];
      maxTokens = AI_CONFIG.MAX_TOKENS;
      temperature = 0.4;
    }

    const workerResult = await callDeepSeekWithRetry(
      messages,
      maxTokens,
      temperature
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

function formatDefaultChatTitle(): string {
  return "New Chat";
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

  if (language === "ar" || language === "ku") {
    // Kurdish Sorani and Arabic both use Arabic script; allow mixed titles as long as Arabic script exists.
    return hasArabicScript;
  }

  if (language === "en") {
    return hasLatinScript;
  }

  return true;
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

  const fillerPattern = /^(?:please|can you|could you|make me|build me|create|generate|design|i want|i need|make a|build a|a website for|website about)\s+/iu;

  while (fillerPattern.test(source)) {
    source = source.replace(fillerPattern, "").trim();
  }

  const words = source
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 7);

  if (words.length === 0) {
    return null;
  }

  const baseTitle = words.join(" ").trim().slice(0, 50).trim();

  if (!isExpectedTitleLanguage(baseTitle, language)) {
    return null;
  }

  const hasArabicScript = /\p{Script=Arabic}/u.test(baseTitle);

  if (hasArabicScript) {
    return baseTitle;
  }

  return language === "en" ? toTitleCaseEnglish(baseTitle) : baseTitle;
}

export async function generateChatTitle(
  userMessage: string,
  preferredLanguage: AppLanguage = "en"
): Promise<string> {
  const trimmedMessage = userMessage.trim();
  const defaultTitle = formatDefaultChatTitle();

  const languageLabel =
    preferredLanguage === "ar"
      ? "Arabic"
      : preferredLanguage === "ku"
        ? "Kurdish Sorani"
        : "English";

  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await getDeepSeekClient().chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              `You are a chat title generator. Your job is to create a short,
descriptive title (2 to 5 words) for a conversation based on the
user's first message. Rules:
- If the message is a greeting (hello, hi, hey, مرحبا, سڵاو etc.)
  -> return a warm short title like "Greeting" or "Hello There"
- If the message is a website request -> return the website type,
  e.g. "Restaurant Website", "Gym Landing Page"
- If the message is a question -> summarize it in 2-4 words
- If the message is unclear or very short -> return "New Chat"
- The title MUST be in ${languageLabel}
- Return ONLY the title. No quotes. No punctuation at the end.
  No explanation. Nothing else.`,
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

      const words = title.split(/\s+/u).filter(Boolean);
      const normalizedTitle = words.join(" ").trim();
      const lowerTitle = normalizedTitle.toLowerCase();

      if (
        !normalizedTitle ||
        normalizedTitle.length > 50 ||
        words.length < 1 ||
        words.length > 5 ||
        lowerTitle === "invalid user input" ||
        lowerTitle === "invalid input" ||
        lowerTitle === "new website" ||
        isLikelyGibberish(normalizedTitle) ||
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

  const heuristicTitle = buildHeuristicTitleFromMessage(
    trimmedMessage,
    preferredLanguage
  );

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
