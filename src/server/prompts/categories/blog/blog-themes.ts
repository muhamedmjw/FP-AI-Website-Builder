// src/server/prompts/categories/blog/blog-themes.ts
import type { WebsiteTheme } from '../../theme-types';

export const BLOG_THEMES: WebsiteTheme[] = [
  {
    id: 'indie-writer',
    name: 'Indie Writer',
    cssFile: 'indie-writer.css',
    category: 'blog',
    personality: 'Personal, intimate, typewriter aesthetic. Warm paper tones.',
    fonts: { heading: 'Libre Baskerville', body: 'Libre Baskerville', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap' },
    colors: { bg: '#faf8f5', surface: '#ffffff', primary: '#8b4513', secondary: '#2c1810', text: '#3d2914', muted: '#8b7355', border: '#e8e0d8' },
    layout: 'single-column',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'tech-dev-blog',
    name: 'Tech Dev Blog',
    cssFile: 'tech-dev-blog.css',
    category: 'blog',
    personality: 'Dark mode, code-friendly, modern monospace accents. Developer focused.',
    fonts: { heading: 'Space Grotesk', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;700&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#0d1117', surface: '#161b22', primary: '#58a6ff', secondary: '#238636', text: '#c9d1d9', muted: '#8b949e', border: '#30363d' },
    layout: 'sidebar',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'lifestyle-pastel',
    name: 'Lifestyle Pastel',
    cssFile: 'lifestyle-pastel.css',
    category: 'blog',
    personality: 'Soft colors, airy, Instagram-friendly. Lifestyle and wellness content.',
    fonts: { heading: 'Playfair Display', body: 'Outfit', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Outfit:wght@300;400;500&display=swap' },
    colors: { bg: '#fdf6f0', surface: '#ffffff', primary: '#f4a261', secondary: '#e9c46a', text: '#264653', muted: '#6b7280', border: '#fce4d6' },
    layout: 'masonry',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'minimalist-prose',
    name: 'Minimalist Prose',
    cssFile: 'minimalist-prose.css',
    category: 'blog',
    personality: 'Extreme minimalism. Typography is everything. Long-form reading focus.',
    fonts: { heading: 'Instrument Serif', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#ffffff', surface: '#fafafa', primary: '#1a1a1a', secondary: '#666666', text: '#1a1a1a', muted: '#999999', border: '#f0f0f0' },
    layout: 'single-column',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'bold-opinion',
    name: 'Bold Opinion',
    cssFile: 'bold-opinion.css',
    category: 'blog',
    personality: 'Strong typography, high contrast. Opinion journalism feel.',
    fonts: { heading: 'DM Serif Display', body: 'Libre Baskerville', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Libre+Baskerville:wght@400;700&display=swap' },
    colors: { bg: '#1a1a1a', surface: '#2a2a2a', primary: '#ff6b6b', secondary: '#ffffff', text: '#f0f0f0', muted: '#888888', border: '#3a3a3a' },
    layout: 'magazine',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
];

export function getRandomBlogTheme(): WebsiteTheme {
  return BLOG_THEMES[Math.floor(Math.random() * BLOG_THEMES.length)];
}
