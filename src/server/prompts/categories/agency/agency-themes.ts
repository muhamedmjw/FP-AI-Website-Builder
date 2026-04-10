// src/server/prompts/categories/agency/agency-themes.ts
import type { WebsiteTheme } from '../../theme-types';

export const AGENCY_THEMES: WebsiteTheme[] = [
  {
    id: 'brutalist-agency',
    name: 'Brutalist Agency',
    cssFile: 'brutalist-agency.css',
    category: 'agency',
    personality: 'Raw, bold, anti-design. Big borders, system fonts.',
    fonts: { heading: 'Space Grotesk', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;700&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#ffffff', surface: '#f0f0f0', primary: '#000000', secondary: '#ff0000', text: '#000000', muted: '#666666', border: '#000000' },
    layout: 'asymmetric',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'glassmorphism-studio',
    name: 'Glassmorphism Studio',
    cssFile: 'glassmorphism-studio.css',
    category: 'agency',
    personality: 'Translucent layers, blur effects, vibrant gradients.',
    fonts: { heading: 'Outfit', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#0f0c29', surface: 'rgba(255,255,255,0.1)', primary: '#00d9ff', secondary: '#ff00ff', text: '#ffffff', muted: 'rgba(255,255,255,0.6)', border: 'rgba(255,255,255,0.2)' },
    layout: 'full-bleed',
    animations: ['fadeUp', 'float'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'motion-forward',
    name: 'Motion Forward',
    cssFile: 'motion-forward.css',
    category: 'agency',
    personality: 'Diagonal lines, dynamic layouts, speed and energy.',
    fonts: { heading: 'Syne', body: 'Outfit', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Outfit:wght@300;400;500&display=swap' },
    colors: { bg: '#fafafa', surface: '#ffffff', primary: '#ff3d00', secondary: '#1a1a1a', text: '#1a1a1a', muted: '#666666', border: '#e0e0e0' },
    layout: 'asymmetric',
    animations: ['fadeUp', 'slideIn'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'pastel-creative',
    name: 'Pastel Creative',
    cssFile: 'pastel-creative.css',
    category: 'agency',
    personality: 'Soft colors, rounded shapes, friendly and approachable.',
    fonts: { heading: 'Poppins', body: 'Outfit', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&family=Outfit:wght@300;400;500&display=swap' },
    colors: { bg: '#faf5ff', surface: '#ffffff', primary: '#9333ea', secondary: '#f472b6', text: '#1e1b4b', muted: '#6b7280', border: '#f3e8ff' },
    layout: 'grid-heavy',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'monochrome-bold',
    name: 'Monochrome Bold',
    cssFile: 'monochrome-bold.css',
    category: 'agency',
    personality: 'Black and white only. Maximum contrast, editorial feel.',
    fonts: { heading: 'DM Serif Display', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#ffffff', surface: '#f5f5f5', primary: '#000000', secondary: '#333333', text: '#000000', muted: '#666666', border: '#000000' },
    layout: 'magazine',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
];

export function getRandomAgencyTheme(): WebsiteTheme {
  return AGENCY_THEMES[Math.floor(Math.random() * AGENCY_THEMES.length)];
}
