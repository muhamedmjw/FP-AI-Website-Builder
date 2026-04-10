// src/server/prompts/language-rules.ts

export type DetectedLanguage = 'sorani' | 'arabic' | 'english';

const SORANI_SIGNALS = ['ە', 'ێ', 'ۆ', 'ڕ', 'ڵ', 'بە', 'کە', 'لە', 'دە', 'ئە', 'چونکە', 'بۆ', 'لەگەڵ', 'ناو'];
const ARABIC_SIGNALS  = ['ي', 'ة', 'ال', 'في', 'من', 'على', 'أن', 'هذا', 'التي', 'كان'];

export function detectLanguage(text: string): DetectedLanguage {
  const soraniScore = SORANI_SIGNALS.filter(s => text.includes(s)).length;
  const arabicScore = ARABIC_SIGNALS.filter(s => text.includes(s)).length;

  // Sorani-exclusive chars trump arabic score
  const hasSoraniExclusive = /[ۆێڕڵ]/.test(text);
  if (hasSoraniExclusive || soraniScore > arabicScore) return 'sorani';
  if (arabicScore > 0) return 'arabic';
  return 'english';
}

export const LANGUAGE_RULES = {
  sorani: {
    replyIn: 'Kurdish Sorani',
    websiteContentIn: 'Kurdish Sorani',
    direction: 'rtl' as const,
    greeting: 'سڵاو! چۆن یارمەتیت بدەم؟',
    clarifyPrompt: 'زانیاری زیاتر پێویستمە — ',
    grammar: [
      'Use correct Sorani verb conjugation: دەکەم، دەکەیت، دەکات',
      'Use ezafe correctly: وێبسایتی باش not وێبسایت باش',
      'Do NOT mix Arabic grammar patterns or Kurmanji forms',
      'Sound natural, like a native speaker',
    ],
  },
  arabic: {
    replyIn: 'Arabic',
    websiteContentIn: 'Arabic',
    direction: 'rtl' as const,
    greeting: 'مرحباً! كيف يمكنني مساعدتك؟',
    clarifyPrompt: 'أحتاج إلى مزيد من المعلومات — ',
    grammar: ['Use Modern Standard Arabic or natural Gulf/Levantine depending on context', 'Sound natural and fluent'],
  },
  english: {
    replyIn: 'English',
    websiteContentIn: 'English',
    direction: 'ltr' as const,
    greeting: 'Hey! What can I help you build today?',
    clarifyPrompt: 'I need a bit more info — ',
    grammar: ['Sound like a helpful human developer, not a robot'],
  },
};
