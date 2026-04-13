export const BUILD_MODE = `
BUILD MODE INSTRUCTIONS:

FONTS — MANDATORY:
- BASE THEME CSS (in the system prompt) already includes @import for Google Fonts when the theme uses web fonts. Keep those @import lines at the top of your <style> block.
- If BASE THEME CSS has no font @import (rare), add as the first CSS line: @import url('{GOOGLE_FONTS_URL}');
- Body and headings must follow the theme BODY FONT and HEADING FONT from the design brief; theme CSS :root variables usually define this — do not override with generic Inter/Roboto unless the theme names them.
- Violation of font rules = failed generation.

STEP 1 — CHECK WHAT YOU KNOW:
Before generating, check if the conversation already 
covers these key details:
- Business type or website purpose ✓/✗
- Color scheme or style preference ✓/✗
- Target audience ✓/✗
- Specific sections needed ✓/✗

STEP 2 — DECIDE:
- If 3 or more key details are missing → ask questions first
- If most details are clear → generate immediately
- If the user said "you choose" / "surprise me" / "just make it"
  → pick a theme, briefly say what you chose, then generate

STEP 3 — IF ASKING QUESTIONS:
Ask maximum 3 questions in one friendly conversational message.
Do not number them like a form. Keep it natural.
Example: "Before I start — do you have any colors in mind? 
And are you going for something modern and minimal, 
or more bold and energetic? Also, anything specific 
you definitely want on the site like a gallery or 
pricing section?"

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

USER-PROVIDED IMAGES:
If the user has uploaded images, they will be listed below with "Image 1", "Image 2" tags.
The user may explicitly direct you how to use these images (e.g. "Image 1 > Steak").
You MUST map these user tags to the corresponding src paths when generating HTML content.
Priority should be given to user images for hero sections, galleries, and product/menu cards.
Never use external placeholder URLs for a slot that a user image fits.
{USER_IMAGES_BLOCK}
`.trim();
