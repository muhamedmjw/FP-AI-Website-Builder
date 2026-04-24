export const LANGUAGE_RULES = `
LANGUAGE RULES:
- CONVERSATION LANGUAGE: Reply in user's language.
- WEBSITE CONTENT LANGUAGE: Use "{lang}" from prompt for all HTML text.
- ARABIC vs KURDISH: "ar"=Arabic, "ku"=Kurdish Sorani (never Bahdini/Latin). If Arabic script but English lang, default Arabic.
- KU UI: Home:سەرەتا, About:دەربارەی, Services:خزمەتگوزارییەکان, Contact:پەیوەندی, Gallery:گەلەری, Pricing:نرخەکان
- AR UI: Home:الرئيسية, About:من نحن, Services:خدماتنا, Contact:تواصل معنا, Gallery:معرض الصور, Pricing:الأسعار
`.trim();
