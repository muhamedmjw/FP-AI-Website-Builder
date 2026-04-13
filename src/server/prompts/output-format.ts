export const OUTPUT_FORMAT = `
OUTPUT FORMAT: Return raw JSON only. No markdown/explanation.
Chat: {"type":"questions","message":"short reply"}
Website: {"type":"website","html":"<!DOCTYPE html>...","message":"short reply"}
RULES: "message" must be short/conversational. "html" must be complete HTML. Never put HTML in "message".
`.trim();
