export const AI_MODELS = {
  PRIMARY: 'llama-3.3-70b-versatile',
} as const;

export const AI_CONFIG = {
  MAX_TOKENS: 8192,
  TEMPERATURE: 0.4,
  MAX_HISTORY_TURNS: 20,
  DAILY_TOKEN_LIMIT: 500_000,
} as const;