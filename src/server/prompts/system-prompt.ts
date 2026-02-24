/**
 * System Prompt — the instruction contract sent to the AI on every request.
 * 
 * Defines:
 * - AI role and output format ({ type, html } | { type, message })
 * - HTML generation rules (embedded CSS/JS, responsive, placeholder images)
 * - Language handling (RTL for ar/ku, English code comments)
 * - Two-phase flow (clarification questions first, then generation)
 */
export const SYSTEM_PROMPT = `
// TODO: paste the finalized system prompt here
` as const;
