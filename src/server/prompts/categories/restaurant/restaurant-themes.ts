// src/server/prompts/categories/restaurant/restaurant-themes.ts
import type { WebsiteTheme } from '../../theme-types';

export const RESTAURANT_THEMES: WebsiteTheme[] = [
  {
    id: 'rustic-warm',
    name: 'Rustic Warm',
    cssFile: 'rustic-warm.css',
    category: 'restaurant',
    personality: 'Cozy farmhouse charm. Wood textures, warm earth tones, hand-written accents.',
    fonts: { heading: 'Playfair Display', body: 'Libre Baskerville', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Libre+Baskerville:wght@400;700&display=swap' },
    colors: { bg: '#faf6f1', surface: '#ffffff', primary: '#8b4513', secondary: '#2c1810', text: '#3d2914', muted: '#8b7355', border: '#d4c4b0' },
    layout: 'centered',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'modern-bistro',
    name: 'Modern Bistro',
    cssFile: 'modern-bistro.css',
    category: 'restaurant',
    personality: 'Clean urban dining. Black and white with gold accents. Menu-focused layout.',
    fonts: { heading: 'DM Serif Display', body: 'Outfit', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@300;400;500&display=swap' },
    colors: { bg: '#ffffff', surface: '#f8f8f8', primary: '#1a1a1a', secondary: '#c9a227', text: '#1a1a1a', muted: '#666666', border: '#e0e0e0' },
    layout: 'sidebar',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'street-food-vibrant',
    name: 'Street Food Vibrant',
    cssFile: 'street-food-vibrant.css',
    category: 'restaurant',
    personality: 'Bold colors, graffiti-inspired, energetic. Food truck culture brought online.',
    fonts: { heading: 'Bebas Neue', body: 'Outfit', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@400;700&display=swap' },
    colors: { bg: '#ff6b35', surface: '#ffffff', primary: '#004e89', secondary: '#ffd23f', text: '#1a1a1a', muted: '#666666', border: 'rgba(255,255,255,0.3)' },
    layout: 'grid-heavy',
    animations: ['fadeUp', 'bounceIn'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'fine-dining-luxury',
    name: 'Fine Dining Luxury',
    cssFile: 'fine-dining-luxury.css',
    category: 'restaurant',
    personality: 'Elegant darkness, gold leaf accents, sophisticated typography. Michelin star feel.',
    fonts: { heading: 'Cinzel', body: 'Cormorant Garamond', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Cormorant+Garamond:wght@300;400;700&display=swap' },
    colors: { bg: '#0a0a0a', surface: '#151515', primary: '#d4af37', secondary: '#ffffff', text: '#e8e8e8', muted: '#888888', border: 'rgba(212,175,55,0.3)' },
    layout: 'full-bleed',
    animations: ['fadeUp'],
    jsFeatures: ['parallax'],
    rtlSafe: true,
  },
  {
    id: 'asian-fusion',
    name: 'Asian Fusion',
    cssFile: 'asian-fusion.css',
    category: 'restaurant',
    personality: 'Minimal zen meets modern. Red accents, clean lines, paper textures.',
    fonts: { heading: 'Syne', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#f5f5f0', surface: '#ffffff', primary: '#c41e3a', secondary: '#1a1a1a', text: '#2a2a2a', muted: '#666666', border: '#e0e0d8' },
    layout: 'asymmetric',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
];

export function getRandomRestaurantTheme(): WebsiteTheme {
  return RESTAURANT_THEMES[Math.floor(Math.random() * RESTAURANT_THEMES.length)];
}
