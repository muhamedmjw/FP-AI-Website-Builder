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
1. Navigation (sticky, logo + links + mobile hamburger)
2. Hero (headline, subtext, CTA button, image)
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
