// src/server/prompts/categories/business/business-themes.ts
import type { WebsiteTheme } from '../../theme-types';

export const BUSINESS_THEMES: WebsiteTheme[] = [
  {
    id: 'corporate-trust',
    name: 'Corporate Trust',
    cssFile: 'corporate-trust.css',
    category: 'business',
    personality: 'Professional navy and white. Clean lines, established feel. Ideal for consulting, law, finance.',
    fonts: { heading: 'DM Serif Display', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@300;400;500;700&display=swap' },
    colors: { bg: '#ffffff', surface: '#f8fafc', primary: '#1e3a8a', secondary: '#64748b', text: '#1e293b', muted: '#64748b', border: '#e2e8f0' },
    layout: 'centered',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'bold-modern-corp',
    name: 'Bold Modern Corp',
    cssFile: 'bold-modern-corp.css',
    category: 'business',
    personality: 'High contrast, bold typography, confident. Red or orange accent on dark or light.',
    fonts: { heading: 'Syne', body: 'Outfit', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Outfit:wght@300;400;500&display=swap' },
    colors: { bg: '#0a0a0a', surface: '#171717', primary: '#ff4500', secondary: '#ffffff', text: '#fafafa', muted: '#a3a3a3', border: '#262626' },
    layout: 'asymmetric',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'startup-energetic',
    name: 'Startup Energetic',
    cssFile: 'startup-energetic.css',
    category: 'business',
    personality: 'Bright gradients, playful shapes, confident. Purple to pink vibes.',
    fonts: { heading: 'Plus Jakarta Sans', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#ffffff', surface: '#faf5ff', primary: '#7c3aed', secondary: '#ec4899', text: '#1e1b4b', muted: '#6b7280', border: '#e9d5ff' },
    layout: 'grid-heavy',
    animations: ['fadeUp', 'float'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'finance-serious',
    name: 'Finance Serious',
    cssFile: 'finance-serious.css',
    category: 'business',
    personality: 'Deep greens, gold accents. Conservative, trustworthy. Bank-like authority.',
    fonts: { heading: 'Cinzel', body: 'Libre Baskerville', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Libre+Baskerville:wght@400;700&display=swap' },
    colors: { bg: '#ffffff', surface: '#f0fdf4', primary: '#14532d', secondary: '#ca8a04', text: '#1a1a1a', muted: '#525252', border: '#dcfce7' },
    layout: 'sidebar',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'eco-corporate',
    name: 'Eco Corporate',
    cssFile: 'eco-corporate.css',
    category: 'business',
    personality: 'Natural greens, earth tones, organic shapes. Sustainability-focused.',
    fonts: { heading: 'Outfit', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#f0fdf4', surface: '#ffffff', primary: '#15803d', secondary: '#65a30d', text: '#14532d', muted: '#4d7c0f', border: '#bbf7d0' },
    layout: 'centered',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
];

export function getRandomBusinessTheme(): WebsiteTheme {
  return BUSINESS_THEMES[Math.floor(Math.random() * BUSINESS_THEMES.length)];
}
