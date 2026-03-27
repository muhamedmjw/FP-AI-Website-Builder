export const THEMES = `
THEME SYSTEM:

IMPORTANT — Before applying any theme:
1. First check if the user mentioned colors, style, or 
   a theme preference in their message or conversation history
2. If they did, use their preference and adapt the closest 
   theme to match
3. If they did not mention any design preference, ask them 
   ONE friendly question before generating:
   Example: "Do you have a color scheme or style in mind, 
   or should I pick one that fits your business?"
4. If they say "you choose" or "surprise me" or similar, 
   pick the best matching theme below and briefly mention 
   what you chose and why

AVAILABLE THEMES — pick by business type if user says 
"you choose":

MODERN LIGHT — most businesses, services, portfolios:
  --primary: #4f46e5
  --primary-dark: #4338ca
  --secondary: #06b6d4
  --bg: #ffffff
  --bg-alt: #f8fafc
  --text: #1e293b
  --text-muted: #64748b
  --border: #e2e8f0

DARK PROFESSIONAL — tech, creative, gaming, agencies:
  --primary: #6366f1
  --primary-dark: #4f46e5
  --secondary: #22d3ee
  --bg: #0f172a
  --bg-alt: #1e293b
  --text: #f1f5f9
  --text-muted: #94a3b8
  --border: #334155

WARM LUXURY — restaurants, hotels, spas, fashion, jewelry:
  --primary: #b45309
  --primary-dark: #92400e
  --secondary: #d97706
  --bg: #fffbeb
  --bg-alt: #fef3c7
  --text: #1c1917
  --text-muted: #78716c
  --border: #e7e5e4

CLEAN MEDICAL — clinics, dentists, pharmacies, health:
  --primary: #0284c7
  --primary-dark: #0369a1
  --secondary: #10b981
  --bg: #ffffff
  --bg-alt: #f0f9ff
  --text: #0c4a6e
  --text-muted: #0369a1
  --border: #bae6fd

BOLD ENERGETIC — gyms, sports, events, food delivery:
  --primary: #dc2626
  --primary-dark: #b91c1c
  --secondary: #f97316
  --bg: #0a0a0a
  --bg-alt: #171717
  --text: #fafafa
  --text-muted: #a3a3a3
  --border: #262626

NATURE GREEN — organic, eco, agriculture, wellness:
  --primary: #16a34a
  --primary-dark: #15803d
  --secondary: #84cc16
  --bg: #f7fee7
  --bg-alt: #ecfccb
  --text: #14532d
  --text-muted: #166534
  --border: #bbf7d0

CORPORATE NAVY — law, finance, consulting, government:
  --primary: #1e3a8a
  --primary-dark: #1e40af
  --secondary: #b45309
  --bg: #ffffff
  --bg-alt: #eff6ff
  --text: #1e3a8a
  --text-muted: #3730a3
  --border: #bfdbfe

Always define chosen theme as CSS variables in :root {}.
If user specifies custom colors, override the variables 
but keep the same :root structure.
`.trim();
