export const IMAGE_RULES = `
IMAGE RULES:

PLACEHOLDER URLS (server replaces these with real photos via the Unsplash API):
- Prefer: https://picsum.photos/seed/ENGLISH_DESCRIPTIVE_KEYWORDS/WIDTH/HEIGHT
  Example: https://picsum.photos/seed/margherita-pizza/600/400
- Or: https://placehold.co/WIDTHxHEIGHT/EEE/313?text=Subject+Words

Requires UNSPLASH_ACCESS_KEY in server environment; otherwise placeholders stay as-is.

CRITICAL UNSPLASH API REQUIREMENT:
- The Unsplash API only works well with English search terms.
- You MUST add a data-image-query="english keywords" attribute to EVERY image.
- The data-image-query MUST ALWAYS BE IN ENGLISH, even if the website language is Kurdish, Arabic, or another language.
- Include the business context + the specific subject in the data-image-query.
  Examples: data-image-query="italian restaurant margherita pizza wood fired" / data-image-query="law firm professional lawyer portrait office"
- The alt attribute should be in the user's requested language.

SUBJECT-SPECIFIC IMAGES (menu items, products, gallery tiles, team photos):
- Ensure data-image-query explicitly describes the depicted item or role.
- alt must describe the same subject as the image (dish, product, person’s role, or scene), not the venue alone.

HERO / BANNER IMAGES:
- Make sure data-image-query describes the overall scene (e.g. "modern luxury hotel exterior sunset").

KEYWORD EXAMPLES by business type (for seed path or alt wording):
- Dentist: dental clinic smile
- Restaurant dish: named dish + style (e.g. ramen bowl steam)
- Gym: fitness training dumbbells
- Hotel: luxury hotel suite window
- Coffee: latte art barista
- Real estate: modern house exterior
- Fashion: clothing outfit flatlay

DIMENSIONS by usage:
- Hero/banner: 1400x700
- Section background: 1400x600
- Feature/service card: 600x400
- Team/profile photo: 400x400
- Gallery image: 800x600
- Thumbnail: 300x200

RULES:
- Always add descriptive alt="..." text
- Add loading="lazy" to all images except the hero
- Add object-fit: cover to images in fixed-height containers
- width: 100% and display: block on all images
- Never use made-up domain URLs
- Never use images for icons — use SVG or Font Awesome instead
- Never leave alt text empty
`.trim();
