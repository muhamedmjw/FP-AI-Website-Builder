export const AI_MODELS = {
  // DeepSeek official API aliases for the latest DeepSeek V3.2 models.
  PRIMARY: "deepseek-chat",
  FALLBACK: "deepseek-reasoner",
} as const;

export const PRIMARY_MODEL =
  process.env.NEXT_PUBLIC_DEEPSEEK_MODEL_PRIMARY?.trim() || AI_MODELS.PRIMARY;

export function getDisplayModelName(modelString: string): string {
  if (modelString === "deepseek-chat") return "DeepSeek V3.2";
  if (modelString === "deepseek-reasoner") return "DeepSeek V3.2 Reasoner";
  if (modelString.includes("deepseek-v3.2")) return "DeepSeek V3.2";
  if (modelString.includes("gpt-4")) return "GPT-4";
  if (modelString.includes("claude")) return "Claude";
  if (modelString.includes("gemini")) return "Gemini";
  // Fallback to a cleaned model id without provider prefix or variant suffix.
  return modelString.split("/").pop()?.split(":")[0] ?? modelString;
}

export const AI_CONFIG = {
  MAX_TOKENS: 8000,
  TEMPERATURE: 0.4,
  MAX_HISTORY_TURNS: 20,
  DAILY_TOKEN_LIMIT: 500_000,
} as const;