export const DESIGN_SYSTEM = `
DESIGN SYSTEM:

TYPOGRAPHY:
- Fonts are determined by the selected theme. Always use the HEADING FONT and
    BODY FONT specified in the SELECTED THEME block above. Never override them.
- If GOOGLE FONTS URL is provided in the theme, import it as the first CSS line;
    if it is empty, use local @font-face rules instead.
- Hero heading: 3rem–4rem, weight 700
- Section heading: 2rem–2.5rem, weight 700
- Body: 1rem, weight 400, line-height 1.6
- Small/caption: 0.875rem
- Buttons: 0.95rem, weight 600

SPACING SCALE:
- Section padding: 5rem 0
- Container: max-width 1200px, margin 0 auto, padding 0 1.5rem
- Card gap: 2rem
- Element gap within components: 1rem to 1.5rem
- Button padding: 0.75rem 1.75rem

LAYOUT:
- Flexbox for component-level (nav, cards row, button groups)
- CSS Grid for page-level (feature grids, card grids, gallery)
- Never use absolute positioning except overlays and badges
- Always use rem/% for widths, never fixed px for layout

VISUAL STYLE:
- Card border-radius: 1rem
- Button border-radius: 0.5rem (default) or 999px (pill style)
- Large section border-radius: 1.5rem
- Card shadow: 0 4px 20px rgba(0,0,0,0.08)
- Card hover shadow: 0 8px 30px rgba(0,0,0,0.12)
- All interactive elements: transition: all 0.3s ease
- Add visual depth with layered backgrounds, contrast bands, and elevated surfaces.
- Use gradients derived from the selected theme colors (primary/secondary/background), not random unrelated hues.
- Apply gradients intentionally: hero or page backdrop plus one interactive accent (buttons/badges/callouts).
- Keep gradients readable with sufficient text contrast and overlays when needed.
- Scroll fade-in: use Intersection Observer in <script>,
  add class "fade-in" to sections, animate opacity 0→1 
  with translateY(20px)→0
`.trim();
