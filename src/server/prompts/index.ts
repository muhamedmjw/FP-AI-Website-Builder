// src/server/prompts/index.ts
import { detectLanguage, LANGUAGE_RULES } from './language-rules';
import { PORTFOLIO_THEMES } from './categories/portfolio/portfolio-themes';
import { RESTAURANT_THEMES } from './categories/restaurant/restaurant-themes';
import { BUSINESS_THEMES } from './categories/business/business-themes';
import { BLOG_THEMES } from './categories/blog/blog-themes';
import { ECOMMERCE_THEMES } from './categories/ecommerce/ecommerce-themes';
import { AGENCY_THEMES } from './categories/agency/agency-themes';
import { LANDING_THEMES } from './categories/landing/landing-themes';
import { EVENT_THEMES } from './categories/event/event-themes';
import { SAAS_THEMES } from './categories/saas/saas-themes';
import { NONPROFIT_THEMES } from './categories/nonprofit/nonprofit-themes';
import { EDUCATION_THEMES } from './categories/education/education-themes';
import { MEDICAL_THEMES } from './categories/medical/medical-themes';
import { REALESTATE_THEMES } from './categories/realestate/realestate-themes';
import { FALLBACK_THEMES } from './categories/fallback/fallback-themes';
import { pickThemeFromList } from './theme-selection';
import type { AppLanguage } from '@/shared/types/database';
import type { WebsiteTheme } from './theme-types';

export type Category = 
  | 'portfolio' 
  | 'restaurant' 
  | 'business' 
  | 'blog' 
  | 'ecommerce' 
  | 'event' 
  | 'saas' 
  | 'education';

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  portfolio: ['portfolio', 'پۆرتفۆلیۆ', 'my work', 'showcase', 'personal site', 'designer', 'developer portfolio', 'resume site', 'photo', 'photography', 'gallery', 'camera', 'portraits', 'photographer', 'visual'],
  restaurant: ['restaurant', 'food', 'چێشتخانە', 'cafe', 'bistro', 'menu', 'dining', 'bakery', 'coffee shop', 'bar', 'eatery', 'cuisine'],
  ecommerce: ['shop', 'store', 'ecommerce', 'فرۆشگا', 'boutique', 'buy', 'sell', 'product', 'cart', 'checkout', 'luxury store', 'fashion store', 'clothing', 'accessories', 'online store'],
  blog: ['blog', 'بلۆگ', 'article', 'post', 'writing', 'journal', 'newsletter'],
  event: ['event', 'conference', 'wedding', 'festival', 'meetup', 'concert', 'party', 'ceremony', 'hackathon'],
  saas: ['saas', 'software', 'app', 'platform', 'tool', 'dashboard', 'subscription', 'task', 'tasks', 'workflow', 'sync', 'team', 'teams', 'productivity', 'collaboration'],
  education: ['school', 'course', 'education', 'learn', 'class', 'university', 'tutor', 'training', 'e-learning'],
  business: ['business', 'company', 'firm', 'corporate', 'service', 'consulting', 'professional', 'agency', 'studio', 'design agency', 'creative', 'branding', 'marketing agency', 'landing', 'coming soon', 'waitlist', 'launch', 'pre-launch', 'single page', 'clinic', 'medical', 'health', 'doctor', 'dentist', 'hospital', 'pharmacy', 'wellness', 'spa', 'therapy', 'real estate', 'property', 'خانوو', 'خانووبەرە', 'housing', 'apartment', 'rent', 'mortgage', 'listings', 'charity', 'nonprofit', 'ngo', 'donation', 'volunteer', 'foundation', 'cause'],
};

const CATEGORY_SPECIFICITY: Record<Category, number> = {
  ecommerce: 8,
  education: 7,
  restaurant: 6,
  event: 5,
  saas: 4,
  portfolio: 3,
  blog: 2,
  business: 1,
};

function toAppLanguage(language: 'sorani' | 'arabic' | 'english'): AppLanguage {
  if (language === 'sorani') return 'ku';
  if (language === 'arabic') return 'ar';
  return 'en';
}

export function detectCategory(userMessage: string): Category {
  const message = userMessage.toLowerCase();
  let bestCategory: Category = 'business';
  let bestScore = 0;

  for (const category of Object.keys(CATEGORY_KEYWORDS) as Category[]) {
    const score = CATEGORY_KEYWORDS[category].reduce((total, keyword) => {
      return total + (message.includes(keyword) ? 1 : 0);
    }, 0);

    const winsByHigherScore = score > bestScore;
    const winsByTieBreaker =
      score > 0 &&
      score === bestScore &&
      CATEGORY_SPECIFICITY[category] > CATEGORY_SPECIFICITY[bestCategory];

    if (winsByHigherScore || winsByTieBreaker) {
      bestCategory = category;
      bestScore = score;
    }
  }

  return bestScore > 0 ? bestCategory : 'business';
}

export function getThemeForCategory(
  category: Category,
  language?: AppLanguage,
  userMessage = ""
): WebsiteTheme {
  let themes: WebsiteTheme[] = [];

  switch (category) {
    case 'portfolio':
      themes = PORTFOLIO_THEMES;
      break;
    case 'restaurant':
      themes = RESTAURANT_THEMES;
      break;
    case 'business':
      themes = BUSINESS_THEMES;
      break;
    case 'blog':
      themes = BLOG_THEMES;
      break;
    case 'ecommerce':
      themes = ECOMMERCE_THEMES;
      break;
    case 'event':
      themes = EVENT_THEMES;
      break;
    case 'saas':
      themes = SAAS_THEMES;
      break;
    case 'education':
      themes = EDUCATION_THEMES;
      break;
    default:
      themes = BUSINESS_THEMES;
  }

  // Use fallback themes if the primary list is empty
  if (!themes || themes.length === 0) {
    themes = FALLBACK_THEMES;
  }

  const theme = pickThemeFromList(themes, userMessage);

  if (language === 'ku') {
    return {
      ...theme,
      fonts: {
        heading: 'NRT',
        body: 'NRT',
        googleFontsUrl: '',
      },
    };
  }

  return theme;
}

export interface SystemPromptResult {
  prompt: string;
  theme: WebsiteTheme;
  category: Category;
  language: 'sorani' | 'arabic' | 'english';
}

export function buildSystemPrompt(userMessage: string, websiteLanguage?: AppLanguage): SystemPromptResult {
  const lang = detectLanguage(userMessage);
  const rules = LANGUAGE_RULES[lang];
  const category = detectCategory(userMessage);
  const theme = getThemeForCategory(category, websiteLanguage ?? toAppLanguage(lang), userMessage);

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
export { pickThemeFromList, userMentionedStyleOrTheme } from './theme-selection';
export { detectLanguage, LANGUAGE_RULES } from './language-rules';
export type { WebsiteTheme, ThemeFont, ThemeColors, LayoutType } from './theme-types';
export { PERSONALITY } from "./personality";
export { OUTPUT_FORMAT } from "./output-format";
export { APP_KNOWLEDGE } from "./app-knowledge";
export { THEMES } from "./design/themes";
export { DESIGN_SYSTEM } from "./design/design-system";
export { MOBILE_RULES } from "./design/mobile";
export { RTL_RULES } from "./design/rtl";
export { IMAGE_RULES } from "./content/images";
export { WEBSITE_STRUCTURE } from "./content/structure";
export { BUILD_MODE } from "./modes/build";
export { EDIT_MODE } from "./modes/edit";
export { CHAT_MODE } from "./modes/chat";
