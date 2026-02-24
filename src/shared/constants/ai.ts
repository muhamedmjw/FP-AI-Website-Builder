export const AI_MODELS = {
  GUEST:      'gpt-4o-mini',           // basic model for guests
  REGISTERED: 'gpt-4o',               // advanced model for registered users
  FALLBACK:   'claude-haiku-4-5-20251001', // fallback if primary fails
} as const;

export const AI_CONFIG = {
  MAX_TOKENS:        4096,
  TEMPERATURE:       0.7,
  MAX_HISTORY_TURNS: 20,  // max number of past messages sent for context
} as const;
