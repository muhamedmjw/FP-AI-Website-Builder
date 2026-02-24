export type AppLanguage = 'en' | 'ar' | 'ku';

export const SUPPORTED_LANGUAGES = [
  { code: 'en' as AppLanguage, label: 'English', dir: 'ltr' },
  { code: 'ar' as AppLanguage, label: 'العربية', dir: 'rtl' },
  { code: 'ku' as AppLanguage, label: 'کوردی', dir: 'rtl' },
] as const;

export const RTL_LANGUAGES: AppLanguage[] = ['ar', 'ku'];
