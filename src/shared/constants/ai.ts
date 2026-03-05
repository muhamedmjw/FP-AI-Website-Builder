export const AI_MODELS = {
  PRIMARY: 'llama-3.3-70b-versatile',  // powerful free-tier model on Groq
} as const;

export const AI_CONFIG = {
  MAX_TOKENS:        8192,
  TEMPERATURE:       0.4,
  MAX_HISTORY_TURNS: 20,  // max number of past messages sent for context
} as const;
