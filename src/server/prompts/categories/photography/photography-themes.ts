// src/server/prompts/categories/photography/photography-themes.ts
import type { WebsiteTheme } from '../../theme-types';

export const PHOTOGRAPHY_THEMES: WebsiteTheme[] = [
  {
    id: 'dark-gallery',
    name: 'Dark Gallery',
    cssFile: 'dark-gallery.css',
    category: 'photography',
    personality: 'Black background, photos pop. Museum aesthetic.',
    fonts: { heading: 'Space Grotesk', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;700&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#0a0a0a', surface: '#141414', primary: '#ffffff', secondary: '#888888', text: '#e8e8e8', muted: '#666666', border: '#1a1a1a' },
    layout: 'masonry',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'light-airy',
    name: 'Light Airy',
    cssFile: 'light-airy.css',
    category: 'photography',
    personality: 'White space, minimal UI, lifestyle photography.',
    fonts: { heading: 'Outfit', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#ffffff', surface: '#fafafa', primary: '#1a1a1a', secondary: '#666666', text: '#1a1a1a', muted: '#999999', border: '#f0f0f0' },
    layout: 'grid-heavy',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'masonry-chaos',
    name: 'Masonry Chaos',
    cssFile: 'masonry-chaos.css',
    category: 'photography',
    personality: 'Overlapping images, dynamic layout, artistic feel.',
    fonts: { heading: 'Bebas Neue', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#f5f5f5', surface: '#ffffff', primary: '#ff006e', secondary: '#1a1a1a', text: '#1a1a1a', muted: '#666666', border: '#e0e0e0' },
    layout: 'masonry',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'film-photography',
    name: 'Film Photography',
    cssFile: 'film-photography.css',
    category: 'photography',
    personality: 'Warm tones, vintage feel, analog aesthetic.',
    fonts: { heading: 'Libre Baskerville', body: 'Libre Baskerville', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap' },
    colors: { bg: '#faf6f1', surface: '#ffffff', primary: '#8b4513', secondary: '#cd853f', text: '#3d2914', muted: '#8b7355', border: '#e8e0d8' },
    layout: 'masonry',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'portfolio-split',
    name: 'Portfolio Split',
    cssFile: 'portfolio-split.css',
    category: 'photography',
    personality: 'Split screen, image left content right.',
    fonts: { heading: 'DM Serif Display', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#ffffff', surface: '#f8f8f8', primary: '#1a1a1a', secondary: '#444444', text: '#1a1a1a', muted: '#888888', border: '#e0e0e0' },
    layout: 'split-screen',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
];

export function getRandomPhotographyTheme(): WebsiteTheme {
  return PHOTOGRAPHY_THEMES[Math.floor(Math.random() * PHOTOGRAPHY_THEMES.length)];
}
