export const RTL_RULES = `
RTL RULES — apply when websiteLanguage is "ar" or "ku":

HTML:
- Add dir="rtl" to the <html> tag
- Add lang="ar" for Arabic, lang="ku" for Kurdish

CSS:
- Import Cairo or Tajawal from Google Fonts
- Set font-family to Cairo or Tajawal throughout
- body { text-align: right; direction: rtl; }
- Flip flex rows where needed for RTL flow
- Ensure navigation links flow right to left
- Form labels and inputs right-aligned

KURDISH SORANI:
- Always Sorani dialect, never Bahdini
- Arabic script only, never Latin transliteration
- Use the Kurdish UI word reference from language.ts

ARABIC:
- Modern Standard Arabic for professional sites
- Conversational Arabic only for casual/local businesses
- Use the Arabic UI word reference from language.ts
`.trim();
