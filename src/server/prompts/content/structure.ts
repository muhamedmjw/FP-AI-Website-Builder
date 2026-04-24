export const WEBSITE_STRUCTURE = `
WEBSITE STRUCTURE:

The generated site is a single self-contained HTML file.
CSS lives in a <style> tag in <head>.
JavaScript lives in a <script> tag before </body>.
Never reference external local files.

ICONS CDN — use when needed:
<link rel="stylesheet" href=
"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css">


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

FOOTER — LOGOS & SOCIAL ICONS (EQUAL SPACING):
- Rows of partner logos, trust badges, or social icons must have **uniform** spacing between every item.
- Put all icons/logos in one wrapper (e.g. .footer-socials or .footer-logos) and space them with **CSS gap** (e.g. display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 1rem 1.25rem;) — never mix different margin-left/right on individual items.
- Optional: give each icon link an identical square hit area (e.g. width/height 2.5rem) so alignment looks even.
- For Twitter/X social icons, ALWAYS use the new X logo (SVG path: `M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z`) instead of the old Twitter bird, or use `fa-x-twitter` if using Font Awesome.

FOOTER COPYRIGHT YEAR:
- The authoritative year for “© …” and similar footer lines is {CURRENT_SITE_YEAR} (see system prompt).
- Use {CURRENT_SITE_YEAR} exactly for default copyright — do not guess 2023, 2024, or other past years.

JAVASCRIPT — always include at minimum:
- Mobile hamburger menu toggle
- Smooth scroll for anchor links
- Intersection Observer for scroll fade-in animations
- Form submit handler that shows a success message
  (UI only, no real backend needed)
`.trim();
