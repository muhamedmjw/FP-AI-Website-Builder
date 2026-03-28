export const AI_MODELS = {
  // OpenRouter free NVIDIA models.
  PRIMARY: "nvidia/nemotron-3-super-120b-a12b:free",
  FALLBACK: "nvidia/nemotron-3-nano-30b-a3b:free",
} as const;

export const PRIMARY_MODEL =
  process.env.NEXT_PUBLIC_OPENROUTER_MODEL_PRIMARY?.trim() || AI_MODELS.PRIMARY;

export function getDisplayModelName(modelString: string): string {
  if (modelString.includes("nemotron-3-super-120b")) return "Nemotron Super 120B";
  if (modelString.includes("nemotron-3-nano-30b")) return "Nemotron Nano 30B";
  if (modelString.includes("gpt-4")) return "GPT-4";
  if (modelString.includes("claude")) return "Claude";
  if (modelString.includes("gemini")) return "Gemini";
  // Fallback to a cleaned model id without provider prefix or variant suffix.
  return modelString.split("/").pop()?.split(":")[0] ?? modelString;
}

export const AI_CONFIG = {
  MAX_TOKENS: 8192,
  TEMPERATURE: 0.4,
  MAX_HISTORY_TURNS: 20,
  DAILY_TOKEN_LIMIT: 500_000,
} as const;