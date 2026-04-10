// src/server/prompts/categories/landing/landing-themes.ts
import type { WebsiteTheme } from '../../theme-types';

export const LANDING_THEMES: WebsiteTheme[] = [
  {
    id: 'saas-gradient',
    name: 'SaaS Gradient',
    cssFile: 'saas-gradient.css',
    category: 'landing',
    personality: 'Purple to blue gradients, modern SaaS aesthetic. Clean conversions.',
    fonts: { heading: 'Plus Jakarta Sans', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#0f172a', surface: '#1e293b', primary: '#8b5cf6', secondary: '#06b6d4', text: '#f8fafc', muted: '#94a3b8', border: 'rgba(139,92,246,0.3)' },
    layout: 'centered',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'app-dark',
    name: 'App Dark',
    cssFile: 'app-dark.css',
    category: 'landing',
    personality: 'Mobile app focus, dark mode, device mockups.',
    fonts: { heading: 'Inter', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap' },
    colors: { bg: '#000000', surface: '#111111', primary: '#34d399', secondary: '#ffffff', text: '#ffffff', muted: '#6b7280', border: '#222222' },
    layout: 'split-screen',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'startup-human',
    name: 'Startup Human',
    cssFile: 'startup-human.css',
    category: 'landing',
    personality: 'Warm colors, human illustrations, friendly copy.',
    fonts: { heading: 'Outfit', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#fff7ed', surface: '#ffffff', primary: '#f97316', secondary: '#ea580c', text: '#431407', muted: '#78716c', border: '#fed7aa' },
    layout: 'centered',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'product-hunt-style',
    name: 'Product Hunt Style',
    cssFile: 'product-hunt-style.css',
    category: 'landing',
    personality: 'Community-driven, orange accents, maker culture.',
    fonts: { heading: 'Poppins', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#ffffff', surface: '#f9fafb', primary: '#ff6154', secondary: '#00b37e', text: '#1f2937', muted: '#6b7280', border: '#e5e7eb' },
    layout: 'sidebar',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'futuristic-launch',
    name: 'Futuristic Launch',
    cssFile: 'futuristic-launch.css',
    category: 'landing',
    personality: 'Neon accents, sci-fi feel, coming soon energy.',
    fonts: { heading: 'Rajdhani', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#020617', surface: '#0f172a', primary: '#00ffff', secondary: '#ff00ff', text: '#e2e8f0', muted: '#64748b', border: '#1e293b' },
    layout: 'centered',
    animations: ['fadeUp', 'glowPulse'],
    jsFeatures: [],
    rtlSafe: true,
  },
];

export function getRandomLandingTheme(): WebsiteTheme {
  return LANDING_THEMES[Math.floor(Math.random() * LANDING_THEMES.length)];
}
