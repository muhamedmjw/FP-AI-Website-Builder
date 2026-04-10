// src/server/prompts/categories/nonprofit/nonprofit-themes.ts
import type { WebsiteTheme } from '../../theme-types';

export const NONPROFIT_THEMES: WebsiteTheme[] = [
  {
    id: 'hopeful-warm',
    name: 'Hopeful Warm',
    cssFile: 'hopeful-warm.css',
    category: 'nonprofit',
    personality: 'Orange and yellow tones, optimistic, donation-focused.',
    fonts: { heading: 'Outfit', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#fff7ed', surface: '#ffffff', primary: '#f97316', secondary: '#eab308', text: '#431407', muted: '#78716c', border: '#fed7aa' },
    layout: 'centered',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'activist-bold',
    name: 'Activist Bold',
    cssFile: 'activist-bold.css',
    category: 'nonprofit',
    personality: 'High contrast, urgent red, call-to-action heavy.',
    fonts: { heading: 'Bebas Neue', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#000000', surface: '#1a1a1a', primary: '#dc2626', secondary: '#ffffff', text: '#fafafa', muted: '#a3a3a3', border: '#333333' },
    layout: 'full-bleed',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'community-friendly',
    name: 'Community Friendly',
    cssFile: 'community-friendly.css',
    category: 'nonprofit',
    personality: 'Soft blue, welcoming, neighborhood feel.',
    fonts: { heading: 'Poppins', body: 'Outfit', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&family=Outfit:wght@300;400;500&display=swap' },
    colors: { bg: '#eff6ff', surface: '#ffffff', primary: '#3b82f6', secondary: '#60a5fa', text: '#1e3a8a', muted: '#4b5563', border: '#dbeafe' },
    layout: 'grid-heavy',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'nature-conservation',
    name: 'Nature Conservation',
    cssFile: 'nature-conservation.css',
    category: 'nonprofit',
    personality: 'Earth tones, greens and browns, environmental focus.',
    fonts: { heading: 'Libre Baskerville', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#f0fdf4', surface: '#ffffff', primary: '#15803d', secondary: '#65a30d', text: '#14532d', muted: '#166534', border: '#bbf7d0' },
    layout: 'masonry',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'formal-charity',
    name: 'Formal Charity',
    cssFile: 'formal-charity.css',
    category: 'nonprofit',
    personality: 'Trustworthy navy, traditional, established institution.',
    fonts: { heading: 'Cinzel', body: 'Cormorant Garamond', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Cormorant+Garamond:wght@300;400;700&display=swap' },
    colors: { bg: '#ffffff', surface: '#f8fafc', primary: '#1e3a8a', secondary: '#b45309', text: '#1e293b', muted: '#64748b', border: '#e2e8f0' },
    layout: 'sidebar',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
];

export function getRandomNonprofitTheme(): WebsiteTheme {
  return NONPROFIT_THEMES[Math.floor(Math.random() * NONPROFIT_THEMES.length)];
}
