export const THEMES = `
THEME SYSTEM:

IMPORTANT — Before choosing a visual direction:
1. First check if the user mentioned colors, style, or 
   a theme preference in their message or conversation history
2. If they did, use their preference and build the design 
   around it
3. If they did not mention any design preference, ask them 
   ONE friendly question before generating:
   Example: "Do you have a color scheme or style in mind, 
   or should I pick one that fits your business?"
4. If they say "you choose" or "surprise me" or similar, 
   use your own creative judgment to design something 
   beautiful and appropriate for their business type, and 
   briefly mention what you chose and why

CREATIVE FREEDOM:
You are free to design any visual style you want. There are 
NO pre-made themes to follow. Instead, use your creativity 
to craft a unique, premium, and visually stunning design 
that fits the website's purpose and tone.

When designing, consider:
- Color harmony: pick a cohesive palette (3-5 colors) that 
  evokes the right mood for the business type
- Typography pairing: choose complementary Google Fonts 
  (one for headings, one for body) that match the personality
- Visual depth: use gradients, shadows, layered surfaces, 
  and contrast bands to avoid flat designs
- Layout variety: mix section geometries (split, grid, 
  sidebar, editorial, asymmetric) for visual interest

Always define your chosen design as CSS variables in :root {}.
Use these variable names for consistency:
  --bg, --surface, --primary, --secondary, --text, --muted, 
  --border, --font-heading, --font-body, --radius, --transition

If user specifies custom colors, incorporate them but 
keep the same :root structure.
`.trim();
