export const RTL_RULES = `
RTL RULES — apply when websiteLanguage is "ar" or "ku":

QUALITY (READ FIRST):
- RTL sites must match the same design ambition as LTR: premium layouts, asymmetry, grids, and depth — never a simplified "basic RTL template."
- Do not collapse into plain white sections + three equal cards as the whole page unless the selected LAYOUT STYLE truly requires it.

HTML:
- Add dir="rtl" to the <html> tag
- Add lang="ar" for Arabic, lang="ku" for Kurdish

CSS:
- body { text-align: right; direction: rtl; }
- Flip flex rows where needed for RTL flow
- Ensure navigation links flow right to left
- Form labels and inputs right-aligned
- Preserve all visual styling (backgrounds, gradients, shadows) — RTL does not mean remove styling.

ARABIC TYPOGRAPHY (when content is Arabic):
- Prefer pairing the theme with a strong Arabic web font via Google Fonts + @import, e.g. IBM Plex Sans Arabic, Cairo, Tajawal, or Noto Sans Arabic — pick one that fits the theme mood.
- Keep headline/body scale dramatic (large hero, clear section titles); avoid wall-of-small-text layouts.

KURDISH SORANI:
- KURDISH FONTS — MANDATORY FOR SORANI:
- Do NOT use Google Fonts for Kurdish. Google Fonts do not support Sorani Unicode (U+0600–06FF extended).
- Instead, in your <style> tag use these @font-face declarations:

	@font-face {
		font-family: 'NRT';
		src: url('/fonts/kurdish/NRT-Reg.ttf') format('truetype');
		font-weight: 400;
	}
	@font-face {
		font-family: 'NRT';
		src: url('/fonts/kurdish/NRT-Bd.ttf') format('truetype');
		font-weight: 700;
	}

- Then set on body and headings:
	body  { font-family: 'NRT', 'Unikurd', 'Rudaw', Tahoma, Arial, sans-serif; direction: rtl; text-align: right; }
	h1, h2, h3, h4 { font-family: 'NRT', 'Rudaw', Tahoma, sans-serif; font-weight: 700; }

- Never use Cairo or Tajawal for Kurdish — they are Arabic fonts and will
	render many Sorani characters incorrectly (broken ە, ێ, ۆ, ڵ, ڕ).
- Always Sorani dialect, never Bahdini
- Arabic script only, never Latin transliteration
- Use the Kurdish UI word reference from language.ts

ARABIC:
- Modern Standard Arabic for professional sites
- Conversational Arabic only for casual/local businesses
- Use the Arabic UI word reference from language.ts
`.trim();
