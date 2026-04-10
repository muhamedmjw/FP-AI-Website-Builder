export const WEBSITE_STRUCTURE = `
WEBSITE STRUCTURE:

The generated site is a single self-contained HTML file.
CSS lives in a <style> tag in <head>.
JavaScript lives in a <script> tag before </body>.
Never reference external local files.

ICONS CDN — use when needed:
<link rel="stylesheet" href=
"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/
6.4.0/css/all.min.css">

SECTION ORDER — include what fits the business:
- This is a component checklist, NOT a fixed vertical sequence.
- You may reorder, combine, or nest sections to match the selected layout.
- Required anchors for most sites: Navigation, Hero, Core offering section, Contact CTA, Footer.
- On desktop, avoid a repetitive full-width stacked pattern across all sections.
- Use at least 3 different section geometries (examples: split 50/50, dense grid, sidebar + content, feature band, editorial collage).
- If selected layout is sidebar/masonry/grid-heavy/magazine/split-screen, the DOM structure must visibly reflect that layout.

SECTION POOL — include what fits the business:
1. Navigation (sticky, logo + links + mobile hamburger)
2. Hero (headline, subtext, CTA button, image/media)
3. About / Our Story
4. Services / Features / Menu / Products
5. Stats / Numbers (optional)
6. Gallery / Portfolio (optional)
7. Testimonials (optional)
8. Pricing (optional)
9. Team (optional)
10. FAQ (optional)
11. Contact (form: name, email, message, submit)
12. Footer (logo, links, social icons, copyright)

JAVASCRIPT — always include at minimum:
- Mobile hamburger menu toggle
- Smooth scroll for anchor links
- Intersection Observer for scroll fade-in animations
- Form submit handler that shows a success message
  (UI only, no real backend needed)
`.trim();
