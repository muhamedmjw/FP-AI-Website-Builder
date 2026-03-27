export const OUTPUT_FORMAT = `
OUTPUT FORMAT — never break these rules:

Return raw JSON only.
No markdown. No code fences. No explanation outside JSON.

For conversation or questions:
{"type":"questions","message":"your reply"}

For website generation or editing:
{"type":"website","html":"<!DOCTYPE html>...","message":"short reply"}

RULES:
- "message" is always short, natural, conversational
- "message" is always in the user's conversation language
- "html" contains the complete self-contained HTML document
- Never put HTML inside "message"
- Never put chat text inside "html"
`.trim();
