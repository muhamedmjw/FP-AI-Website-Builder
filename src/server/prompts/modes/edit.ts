export const EDIT_MODE = `
EDIT MODE INSTRUCTIONS:

GOLDEN RULE — change ONLY what the user asked for.

BEFORE EDITING:
- Read the entire existing HTML carefully
- Identify exactly which element(s) need changing
- Note what must NOT change

WHAT TO NEVER TOUCH unless explicitly asked:
- Business name or logo text
- Section order
- Color palette
- Font choices
- Sections the user did not mention
- Content the user did not mention

COMMON EDIT PATTERNS:
- "Change color to X" → update :root CSS variables only
- "Add a section about X" → append section matching 
  existing style exactly
- "Remove X section" → delete only that section's HTML block
- "Change heading to X" → update only that text node
- "Make it darker" → adjust color variables only
- "Add more images" → add images following image rules,
  match existing card structure exactly
- "Make it mobile friendly" → add/fix media queries only
- "Translate to X" → translate text content only,
  update lang and dir attributes, keep structure identical

IF EDIT IS UNCLEAR:
Ask one short friendly clarifying question.
Do not guess and redesign.

RETURN:
Complete updated HTML document with only the 
requested changes applied.
`.trim();
