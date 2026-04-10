// src/server/prompts/index.ts
import { detectLanguage, LANGUAGE_RULES } from './language-rules';
import { getRandomPortfolioTheme } from './categories/portfolio/portfolio-themes';
import { getRandomRestaurantTheme } from './categories/restaurant/restaurant-themes';
import { getRandomBusinessTheme } from './categories/business/business-themes';
import { getRandomBlogTheme } from './categories/blog/blog-themes';
import { getRandomEcommerceTheme } from './categories/ecommerce/ecommerce-themes';
import { getRandomAgencyTheme } from './categories/agency/agency-themes';
import { getRandomLandingTheme } from './categories/landing/landing-themes';
import { getRandomEventTheme } from './categories/event/event-themes';
import { getRandomSaasTheme } from './categories/saas/saas-themes';
import { getRandomNonprofitTheme } from './categories/nonprofit/nonprofit-themes';
import { getRandomEducationTheme } from './categories/education/education-themes';
import { getRandomMedicalTheme } from './categories/medical/medical-themes';
import { getRandomRealestateTheme } from './categories/realestate/realestate-themes';
import { getRandomPhotographyTheme } from './categories/photography/photography-themes';
import type { WebsiteTheme } from './theme-types';

export type Category = 
  | 'portfolio' 
  | 'restaurant' 
  | 'business' 
  | 'blog' 
  | 'ecommerce' 
  | 'agency' 
  | 'landing' 
  | 'event' 
  | 'saas' 
  | 'nonprofit' 
  | 'education' 
  | 'medical' 
  | 'realestate' 
  | 'photography';

export function detectCategory(userMessage: string): Category {
  const m = userMessage.toLowerCase();
  if (m.includes('portfolio') || m.includes('پۆرتفۆلیۆ')) return 'portfolio';
  if (m.includes('restaurant') || m.includes('food') || m.includes('چێشتخانە')) return 'restaurant';
  if (m.includes('shop') || m.includes('store') || m.includes('ecommerce') || m.includes('فرۆشگا')) return 'ecommerce';
  if (m.includes('blog') || m.includes('بلۆگ')) return 'blog';
  if (m.includes('agency') || m.includes('studio') || m.includes('design')) return 'agency';
  if (m.includes('landing') || m.includes('coming soon')) return 'landing';
  if (m.includes('event') || m.includes('conference') || m.includes('wedding')) return 'event';
  if (m.includes('saas') || m.includes('software') || m.includes('app')) return 'saas';
  if (m.includes('clinic') || m.includes('medical') || m.includes('health') || m.includes('doctor')) return 'medical';
  if (m.includes('real estate') || m.includes('property') || m.includes('خانوو') || m.includes('خانووبەرە')) return 'realestate';
  if (m.includes('photo') || m.includes('gallery') || m.includes('camera')) return 'photography';
  if (m.includes('charity') || m.includes('nonprofit') || m.includes('ngo')) return 'nonprofit';
  if (m.includes('school') || m.includes('course') || m.includes('education') || m.includes('class')) return 'education';
  return 'business';
}

export function getThemeForCategory(category: Category): WebsiteTheme {
  switch (category) {
    case 'portfolio':   return getRandomPortfolioTheme();
    case 'restaurant':  return getRandomRestaurantTheme();
    case 'business':    return getRandomBusinessTheme();
    case 'blog':        return getRandomBlogTheme();
    case 'ecommerce':   return getRandomEcommerceTheme();
    case 'agency':      return getRandomAgencyTheme();
    case 'landing':     return getRandomLandingTheme();
    case 'event':       return getRandomEventTheme();
    case 'saas':        return getRandomSaasTheme();
    case 'nonprofit':   return getRandomNonprofitTheme();
    case 'education':   return getRandomEducationTheme();
    case 'medical':     return getRandomMedicalTheme();
    case 'realestate':  return getRandomRealestateTheme();
    case 'photography': return getRandomPhotographyTheme();
    default:            return getRandomBusinessTheme();
  }
}

export interface SystemPromptResult {
  prompt: string;
  theme: WebsiteTheme;
  category: Category;
  language: 'sorani' | 'arabic' | 'english';
}

export function buildSystemPrompt(userMessage: string): SystemPromptResult {
  const lang = detectLanguage(userMessage);
  const rules = LANGUAGE_RULES[lang];
  const category = detectCategory(userMessage);
  const theme = getThemeForCategory(category);

  const prompt = `
You are an expert web developer building a ${category} website.

LANGUAGE: Reply in ${rules.replyIn}. All website content must be in ${rules.websiteContentIn}.
DIRECTION: ${rules.direction.toUpperCase()}
${rules.grammar.map(g => `- ${g}`).join('\n')}

THEME SELECTED: ${theme.name} (${theme.id})
CSS FILE TO USE: src/server/prompts/categories/${category}/themes/${theme.cssFile}
PERSONALITY: ${theme.personality}
LAYOUT: ${theme.layout}
FONTS: ${theme.fonts.heading} (headings) + ${theme.fonts.body} (body)

GENERATION RULES:
- Link the correct CSS file in the HTML <head> using: <link rel="stylesheet" href="${theme.cssFile}">
- Load Google Fonts: ${theme.fonts.googleFontsUrl}
- Write semantic HTML that fits the classes defined in that CSS file
- Populate with realistic ${rules.websiteContentIn} placeholder content
- Add scroll animation JS: on DOMContentLoaded, observe [data-scroll] elements and add class .visible when in viewport
- Only add dark mode toggle if user explicitly asked for it
- Only add language dropdown if user explicitly asked for it
- Keep JS minimal and self-contained in a <script> tag
- If language is Sorani or Arabic, add dir="rtl" to the <html> tag

OUTPUT FORMAT:
Return a JSON object with:
{
  "type": "website",
  "message": "brief friendly confirmation in ${rules.replyIn}",
  "code": {
    "html": "complete HTML document with embedded CSS link and content"
  }
}

CSS REFERENCE (use these exact class names):
- Navigation: nav, .logo, nav ul, nav ul a
- Hero: .hero, .hero h1, .hero p, .btn, .btn-primary
- Sections: section, .section-title
- Cards: .card, .card h3, .grid-3
- Footer: footer
- Animations: [data-scroll], .visible
`.trim();

  return {
    prompt,
    theme,
    category,
    language: lang,
  };
}

// Re-exports for convenience
export { detectLanguage, LANGUAGE_RULES } from './language-rules';
export type { WebsiteTheme, ThemeFont, ThemeColors, LayoutType } from './theme-types';
