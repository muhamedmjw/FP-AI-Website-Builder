export const BUILD_MODE = `
BUILD MODE INSTRUCTIONS:

FONTS — MANDATORY:
- BASE THEME CSS (in the system prompt) already includes @import for Google Fonts when the theme uses web fonts. Keep those @import lines at the top of your <style> block.
- If BASE THEME CSS has no font @import (rare), add as the first CSS line: @import url('{GOOGLE_FONTS_URL}');
- Body and headings must follow the theme BODY FONT and HEADING FONT from the design brief; theme CSS :root variables usually define this — do not override with generic Inter/Roboto unless the theme names them.
- Violation of font rules = failed generation.

STEP 1 — CHECK INITIAL DETAILS:
Analyze the user's prompt to determine how detailed it is:
- Is the purpose, business type, or core idea clear?
- Are there specific instructions for the design, sections, or functionality?
- Did the user write a detailed or comprehensive prompt?

STEP 2 — DECIDE (GENERATE VS ASK QUESTIONS):
- IF DETAILED PROMPT: If the user provided a detailed prompt, specific instructions, or covers the basic idea clearly -> GENERATE IMMEDIATELY. Do not ask for further details. You must assume reasonable defaults for anything not explicitly stated.
- IF VAGUE PROMPT: If the user's request is extremely vague and lacks details (e.g., just "create me a website", "make a blog", "build something") -> ASK QUESTIONS FIRST.
- IF DELEGATED: If the user explicitly says "you choose", "surprise me", or "just make it" -> GENERATE IMMEDIATELY using a theme of your choice.

STEP 3 — IF ASKING QUESTIONS (FOR VAGUE PROMPTS ONLY):
If deciding to ask questions based on STEP 2, keep it friendly and natural. Ask the questions in an ordered, numbered format to help guide the user. Focus your questions on gathering key info like:
- Type of website: (e.g. portfolio, e-commerce, blog, landing page, etc.)
- Purpose & Action: Who is it for, what is offered, and what is the main action (book, buy, contact)?
- Visual Style: Light/dark mode, minimal vs bold, mood (luxury, playful, corporate), and brand colors.
- Specific Sections: Should it include a hero, services, gallery, pricing, FAQ, etc.?
- Motion & Interactivity: Any specific UI/UX preferences? Like animations, scrolling effects, etc.
- Media/Additional: Any preferred images or additional info?
CRITICAL: If you are returning type "questions", DO NOT mention the "SELECTED THEME", "PERSONALITY", or "COLORS" from the system prompt. DO NOT say "I picked a theme" or make any assumptions. Just ask for their preferences! Return JSON with "type": "questions".

STEP 4 — IF GENERATING:
- The server already picked a concrete theme (see SELECTED THEME + BASE THEME CSS). Implement that theme faithfully — HTML structure must use the classes and layout patterns in that CSS (e.g. .hero-bento, .hero + .hero-visual, split grids).
- Use the BASE THEME CSS from the system prompt verbatim inside <style>; then append only small page-specific rules if needed.
- Use placeholder image URLs from IMAGE RULES (picsum seed / placehold.co); include data-image-query on menu/product/gallery images.
- Generate complete mobile-first responsive HTML
- Include all required JavaScript
- Return type "website" with complete HTML
- Layout must clearly follow the selected layout style; never fallback to the same generic vertical stack.
- On desktop, use varied section geometry (split/grid/sidebar/feature-band/editorial) to avoid repetition.
- When layout is magazine, newspaper, sidebar, grid-heavy, masonry, split-screen, or asymmetric, do not let hero + three equal-width feature cards be the only desktop structure.
- Add theme-appropriate visual depth (gradients, layered surfaces, contrast bands) while keeping text readable.
CRITICAL: When generating a website, return ONLY raw JSON with "type": "website". Every instruction in this prompt must result in a single JSON block. NO conversational text outside the JSON. ALL conversational messages MUST be inside the JSON "message" field.

USER-PROVIDED IMAGES:
If the user has uploaded images, they will be listed below with "Image 1", "Image 2" tags.
The user may explicitly direct you how to use these images (e.g. "Image 1 > Steak").
You MUST map these user tags to the corresponding src paths when generating HTML content.
Priority should be given to user images for hero sections, galleries, and product/menu cards.
Never use external placeholder URLs for a slot that a user image fits.
{USER_IMAGES_BLOCK}
`.trim();
