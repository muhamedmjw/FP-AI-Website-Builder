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
import type { AppLanguage } from '@/shared/types/database';
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

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  portfolio: ['portfolio', 'پۆرتفۆلیۆ', 'my work', 'showcase', 'personal site', 'designer', 'developer portfolio', 'resume site'],
  restaurant: ['restaurant', 'food', 'چێشتخانە', 'cafe', 'bistro', 'menu', 'dining', 'bakery', 'coffee shop', 'bar', 'eatery', 'cuisine'],
  ecommerce: ['shop', 'store', 'ecommerce', 'فرۆشگا', 'boutique', 'buy', 'sell', 'product', 'cart', 'checkout', 'luxury store', 'fashion store', 'clothing', 'accessories', 'online store'],
  blog: ['blog', 'بلۆگ', 'article', 'post', 'writing', 'journal', 'newsletter'],
  agency: ['agency', 'studio', 'design agency', 'creative', 'branding', 'marketing agency'],
  landing: ['landing', 'coming soon', 'waitlist', 'launch', 'pre-launch', 'single page'],
  event: ['event', 'conference', 'wedding', 'festival', 'meetup', 'concert', 'party', 'ceremony', 'hackathon'],
  saas: ['saas', 'software', 'app', 'platform', 'tool', 'dashboard', 'subscription'],
  medical: ['clinic', 'medical', 'health', 'doctor', 'dentist', 'hospital', 'pharmacy', 'wellness', 'spa', 'therapy'],
  realestate: ['real estate', 'property', 'خانوو', 'خانووبەرە', 'housing', 'apartment', 'rent', 'mortgage', 'listings'],
  photography: ['photo', 'photography', 'gallery', 'camera', 'portraits', 'photographer', 'visual'],
  nonprofit: ['charity', 'nonprofit', 'ngo', 'donation', 'volunteer', 'foundation', 'cause'],
  education: ['school', 'course', 'education', 'learn', 'class', 'university', 'tutor', 'training', 'e-learning'],
  business: ['business', 'company', 'firm', 'corporate', 'service', 'consulting', 'professional'],
};

const CATEGORY_SPECIFICITY: Record<Category, number> = {
  ecommerce: 14,
  realestate: 13,
  medical: 12,
  nonprofit: 11,
  education: 10,
  photography: 9,
  restaurant: 8,
  event: 7,
  saas: 6,
  portfolio: 5,
  agency: 4,
  blog: 3,
  landing: 2,
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

export function getThemeForCategory(category: Category, language?: AppLanguage): WebsiteTheme {
  let theme: WebsiteTheme;

  switch (category) {
    case 'portfolio':
      theme = getRandomPortfolioTheme();
      break;
    case 'restaurant':
      theme = getRandomRestaurantTheme();
      break;
    case 'business':
      theme = getRandomBusinessTheme();
      break;
    case 'blog':
      theme = getRandomBlogTheme();
      break;
    case 'ecommerce':
      theme = getRandomEcommerceTheme();
      break;
    case 'agency':
      theme = getRandomAgencyTheme();
      break;
    case 'landing':
      theme = getRandomLandingTheme();
      break;
    case 'event':
      theme = getRandomEventTheme();
      break;
    case 'saas':
      theme = getRandomSaasTheme();
      break;
    case 'nonprofit':
      theme = getRandomNonprofitTheme();
      break;
    case 'education':
      theme = getRandomEducationTheme();
      break;
    case 'medical':
      theme = getRandomMedicalTheme();
      break;
    case 'realestate':
      theme = getRandomRealestateTheme();
      break;
    case 'photography':
      theme = getRandomPhotographyTheme();
      break;
    default:
      theme = getRandomBusinessTheme();
  }

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
  const theme = getThemeForCategory(category, websiteLanguage ?? toAppLanguage(lang));

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
