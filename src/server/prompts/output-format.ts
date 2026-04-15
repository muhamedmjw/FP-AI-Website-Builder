export const OUTPUT_FORMAT = `
OUTPUT FORMAT: Return raw JSON only. No markdown/explanation.
Chat: {"type":"questions","message":"short reply"}
Website: {"type":"website","html":"<!DOCTYPE html>...","message":"short reply"}
RULES: 
1. "message" must be short/conversational. 
2. "html" must be complete HTML. 
3. Never put HTML in "message".
4. ALL conversational text MUST be inside the "message" field of the JSON. 
5. ABSOLUTELY NO conversational text, markdown, or explanation should exist outside the JSON block.
`.trim();
