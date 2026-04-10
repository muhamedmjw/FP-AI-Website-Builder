// src/server/prompts/categories/ecommerce/ecommerce-themes.ts
import type { WebsiteTheme } from '../../theme-types';

export const ECOMMERCE_THEMES: WebsiteTheme[] = [
  {
    id: 'luxury-boutique',
    name: 'Luxury Boutique',
    cssFile: 'luxury-boutique.css',
    category: 'ecommerce',
    personality: 'Elegant product displays, gold accents, high-end fashion feel.',
    fonts: { heading: 'Playfair Display', body: 'Cormorant Garamond', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Cormorant+Garamond:wght@300;400;700&display=swap' },
    colors: { bg: '#faf9f7', surface: '#ffffff', primary: '#1a1a1a', secondary: '#c9a227', text: '#1a1a1a', muted: '#666666', border: '#e8e6e1' },
    layout: 'grid-heavy',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'playful-store',
    name: 'Playful Store',
    cssFile: 'playful-store.css',
    category: 'ecommerce',
    personality: 'Bright colors, rounded corners, fun shopping experience.',
    fonts: { heading: 'Poppins', body: 'Outfit', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&family=Outfit:wght@300;400;500&display=swap' },
    colors: { bg: '#fff5f5', surface: '#ffffff', primary: '#ff6b6b', secondary: '#4ecdc4', text: '#2d3436', muted: '#636e72', border: '#ffe0e0' },
    layout: 'grid-heavy',
    animations: ['fadeUp', 'bounceIn'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'marketplace-clean',
    name: 'Marketplace Clean',
    cssFile: 'marketplace-clean.css',
    category: 'ecommerce',
    personality: 'Minimal, lots of white space, Amazon-style functionality.',
    fonts: { heading: 'Inter', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap' },
    colors: { bg: '#ffffff', surface: '#f8f9fa', primary: '#212529', secondary: '#495057', text: '#212529', muted: '#6c757d', border: '#dee2e6' },
    layout: 'sidebar',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'vintage-shop',
    name: 'Vintage Shop',
    cssFile: 'vintage-shop.css',
    category: 'ecommerce',
    personality: 'Retro aesthetics, warm tones, antique store charm.',
    fonts: { heading: 'DM Serif Display', body: 'Libre Baskerville', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Libre+Baskerville:wght@400;700&display=swap' },
    colors: { bg: '#f5f0e8', surface: '#faf7f2', primary: '#8b4513', secondary: '#cd853f', text: '#3d2914', muted: '#8b7355', border: '#e0d5c5' },
    layout: 'masonry',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'streetwear-hype',
    name: 'Streetwear Hype',
    cssFile: 'streetwear-hype.css',
    category: 'ecommerce',
    personality: 'Urban, bold, limited drops aesthetic. Black and neon.',
    fonts: { heading: 'Bebas Neue', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#0a0a0a', surface: '#141414', primary: '#ff006e', secondary: '#ffffff', text: '#fafafa', muted: '#888888', border: '#2a2a2a' },
    layout: 'full-bleed',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
];

export function getRandomEcommerceTheme(): WebsiteTheme {
  return ECOMMERCE_THEMES[Math.floor(Math.random() * ECOMMERCE_THEMES.length)];
}
