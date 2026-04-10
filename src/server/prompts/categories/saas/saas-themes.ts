// src/server/prompts/categories/saas/saas-themes.ts
import type { WebsiteTheme } from '../../theme-types';

export const SAAS_THEMES: WebsiteTheme[] = [
  {
    id: 'linear-inspired',
    name: 'Linear Inspired',
    cssFile: 'linear-inspired.css',
    category: 'saas',
    personality: 'Dark, purple accents, subtle gradients. Issue tracker aesthetic.',
    fonts: { heading: 'Inter', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap' },
    colors: { bg: '#0e0e10', surface: '#1c1c1f', primary: '#5e6ad2', secondary: '#818cf8', text: '#ececee', muted: '#6e6e78', border: '#2e2e33' },
    layout: 'sidebar',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'notion-style',
    name: 'Notion Style',
    cssFile: 'notion-style.css',
    category: 'saas',
    personality: 'Clean white, subtle shadows, knowledge base feel.',
    fonts: { heading: 'Inter', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap' },
    colors: { bg: '#ffffff', surface: '#f7f6f3', primary: '#2eaadc', secondary: '#37352f', text: '#37352f', muted: '#9ca3af', border: '#e3e2e0' },
    layout: 'sidebar',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'stripe-inspired',
    name: 'Stripe Inspired',
    cssFile: 'stripe-inspired.css',
    category: 'saas',
    personality: 'Bold gradients, navy, developer-focused.',
    fonts: { heading: 'Inter', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap' },
    colors: { bg: '#0a2540', surface: '#ffffff', primary: '#635bff', secondary: '#00d4ff', text: '#1a1a1a', muted: '#6b7280', border: '#e5e7eb' },
    layout: 'centered',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'vercel-dark',
    name: 'Vercel Dark',
    cssFile: 'vercel-dark.css',
    category: 'saas',
    personality: 'Pure black, white text, developer tools feel.',
    fonts: { heading: 'Inter', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap' },
    colors: { bg: '#000000', surface: '#111111', primary: '#ffffff', secondary: '#888888', text: '#ffffff', muted: '#666666', border: '#333333' },
    layout: 'centered',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'colorful-saas',
    name: 'Colorful SaaS',
    cssFile: 'colorful-saas.css',
    category: 'saas',
    personality: 'Vibrant, playful, productivity app aesthetic.',
    fonts: { heading: 'Plus Jakarta Sans', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#ffffff', surface: '#fefce8', primary: '#eab308', secondary: '#f97316', text: '#1e293b', muted: '#64748b', border: '#fef08a' },
    layout: 'grid-heavy',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
];

export function getRandomSaasTheme(): WebsiteTheme {
  return SAAS_THEMES[Math.floor(Math.random() * SAAS_THEMES.length)];
}
