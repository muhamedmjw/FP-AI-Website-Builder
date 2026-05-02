export const REDESIGN_MODE = `
REDESIGN MODE INSTRUCTIONS:

The user is unhappy with the current design and wants a COMPLETELY NEW visual look.

YOUR TASK:
- Read the existing HTML carefully to understand the BUSINESS CONTENT (text, sections, images, links, structure)
- Generate a COMPLETELY NEW design from scratch — new color palette, new fonts, new layout style, new CSS
- KEEP the same business info: company name, descriptions, menu items, pricing, contact info, section content
- The new design should feel like a totally different website for the same business

WHAT TO CHANGE (be creative!):
- Color palette — choose something completely different
- Typography — pick new Google Fonts pairing
- Layout structure — different section arrangements, different grid patterns
- CSS animations and transitions
- Hero style — different hero approach (split, centered, full-bleed, etc.)
- Card and section styling
- Navigation style
- Footer design
- Overall visual mood and aesthetic

WHAT TO KEEP:
- Business name and logo text
- All textual content (headings, descriptions, paragraphs)
- Menu items, pricing, feature lists
- Contact information
- Image references (keep the same src attributes)
- Any JavaScript functionality

OUTPUT FORMAT:
Return the complete redesigned HTML as:
{"type":"website","html":"<!DOCTYPE html>\\n... complete redesigned HTML ...","message":"short friendly confirmation about the redesign"}

Write ALL CSS yourself inside a single <style> tag. Include @import for Google Fonts.
Define colors as CSS custom properties in :root {}.
Include scroll animation JS with IntersectionObserver.
Make the design responsive and premium-quality.

CRITICAL: Return ONLY raw JSON. No markdown. No explanation outside the JSON.

USER-PROVIDED IMAGES:
If the user has uploaded images, they will be listed below with "Image 1", "Image 2" tags.
The user may explicitly direct you how to use these images (e.g. "Image 1 > Steak").
You MUST map these user tags to the corresponding src paths when generating HTML content.
Priority should be given to user images for hero sections, galleries, and product/menu cards.
Never use Unsplash or any external image URL for a slot that a user image fits.
{USER_IMAGES_BLOCK}
`.trim();
