// src/server/prompts/categories/realestate/realestate-themes.ts
import type { WebsiteTheme } from '../../theme-types';

export const REALESTATE_THEMES: WebsiteTheme[] = [
  {
    id: 'luxury-properties',
    name: 'Luxury Properties',
    cssFile: 'luxury-properties.css',
    category: 'realestate',
    personality: 'Black and gold, high-end listings, exclusive feel.',
    fonts: { heading: 'Playfair Display', body: 'Cormorant Garamond', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Cormorant+Garamond:wght@300;400;700&display=swap' },
    colors: { bg: '#0a0a0a', surface: '#141414', primary: '#d4af37', secondary: '#ffffff', text: '#e8e8e8', muted: '#888888', border: 'rgba(212,175,55,0.3)' },
    layout: 'grid-heavy',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'modern-listings',
    name: 'Modern Listings',
    cssFile: 'modern-listings.css',
    category: 'realestate',
    personality: 'Clean white, large photos, minimal info density.',
    fonts: { heading: 'Inter', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap' },
    colors: { bg: '#ffffff', surface: '#f9fafb', primary: '#111827', secondary: '#4b5563', text: '#1f2937', muted: '#6b7280', border: '#e5e7eb' },
    layout: 'sidebar',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'neighborhood-friendly',
    name: 'Neighborhood Friendly',
    cssFile: 'neighborhood-friendly.css',
    category: 'realestate',
    personality: 'Warm tones, community focus, local agent feel.',
    fonts: { heading: 'Outfit', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#fff7ed', surface: '#ffffff', primary: '#c2410c', secondary: '#ea580c', text: '#431407', muted: '#78716c', border: '#fed7aa' },
    layout: 'centered',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'commercial-invest',
    name: 'Commercial Invest',
    cssFile: 'commercial-invest.css',
    category: 'realestate',
    personality: 'Corporate blue, data-driven, investment focused.',
    fonts: { heading: 'Inter', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap' },
    colors: { bg: '#ffffff', surface: '#eff6ff', primary: '#1e40af', secondary: '#3b82f6', text: '#1e3a8a', muted: '#4b5563', border: '#dbeafe' },
    layout: 'sidebar',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'airbnb-inspired',
    name: 'Airbnb Inspired',
    cssFile: 'airbnb-inspired.css',
    category: 'realestate',
    personality: 'Rausch pink, photo-first, travel vibe.',
    fonts: { heading: 'Plus Jakarta Sans', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#ffffff', surface: '#ffffff', primary: '#ff5a5f', secondary: '#00a699', text: '#484848', muted: '#767676', border: '#ebebeb' },
    layout: 'masonry',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
];

export function getRandomRealestateTheme(): WebsiteTheme {
  return REALESTATE_THEMES[Math.floor(Math.random() * REALESTATE_THEMES.length)];
}
