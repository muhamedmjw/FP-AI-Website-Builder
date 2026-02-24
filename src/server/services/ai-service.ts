/**
 * AI Service — handles all communication with external AI provider APIs.
 * 
 * Responsibilities:
 * - Build the messages array (system prompt + conversation history)
 * - Call the configured AI provider (OpenAI / Anthropic / Gemini)
 * - Parse the JSON response ({ type: 'website', html: '...' } | { type: 'questions', message: '...' })
 * - Handle retries on context window exceeded errors
 * - Log each API call to the ai_generations table
 */
export {}
