export const AI_MODELS = {
  // OpenRouter free NVIDIA models.
  PRIMARY: "nvidia/nemotron-3-super-120b-a12b:free",
  FALLBACK: "nvidia/nemotron-3-nano-30b-a3b:free",
} as const;

export const AI_CONFIG = {
  MAX_TOKENS: 8192,
  TEMPERATURE: 0.4,
  MAX_HISTORY_TURNS: 20,
  DAILY_TOKEN_LIMIT: 500_000,
} as const;