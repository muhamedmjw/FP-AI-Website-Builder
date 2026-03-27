export const MOBILE_RULES = `
MOBILE-FIRST RULES — mandatory every generation:

- Write ALL base CSS targeting mobile screens first
- Use @media (min-width: 768px) for tablet
- Use @media (min-width: 1024px) for desktop
- Always include in <head>:
  <meta name="viewport" content="width=device-width, 
  initial-scale=1.0">
- Navigation: hamburger menu on mobile with working JS toggle
- Grids: collapse to single column on mobile 
  (grid-template-columns: 1fr)
- Hero heading: max 2.2rem on mobile
- Images: width 100%, height auto, object-fit cover 
  for fixed-height containers
- Buttons: full width on mobile, auto width on desktop
- Never use fixed pixel widths for layout
- Minimum touch target size: 44px height for buttons and links
- Padding on mobile: reduce section padding to 3rem 0
`.trim();
