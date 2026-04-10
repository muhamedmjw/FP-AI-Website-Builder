// src/server/prompts/categories/medical/medical-themes.ts
import type { WebsiteTheme } from '../../theme-types';

export const MEDICAL_THEMES: WebsiteTheme[] = [
  {
    id: 'clinical-trust',
    name: 'Clinical Trust',
    cssFile: 'clinical-trust.css',
    category: 'medical',
    personality: 'Clean white, blue accents, professional healthcare.',
    fonts: { heading: 'Inter', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap' },
    colors: { bg: '#ffffff', surface: '#f0f9ff', primary: '#0284c7', secondary: '#0ea5e9', text: '#0c4a6e', muted: '#0369a1', border: '#bae6fd' },
    layout: 'sidebar',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'wellness-spa',
    name: 'Wellness Spa',
    cssFile: 'wellness-spa.css',
    category: 'medical',
    personality: 'Soft greens, calming, holistic health.',
    fonts: { heading: 'Cormorant Garamond', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;700&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#f0fdf4', surface: '#ffffff', primary: '#059669', secondary: '#10b981', text: '#064e3b', muted: '#065f46', border: '#a7f3d0' },
    layout: 'masonry',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'modern-health-app',
    name: 'Modern Health App',
    cssFile: 'modern-health-app.css',
    category: 'medical',
    personality: 'Purple accents, app-like interface, tech-forward.',
    fonts: { heading: 'Plus Jakarta Sans', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#faf5ff', surface: '#ffffff', primary: '#7c3aed', secondary: '#8b5cf6', text: '#3b0764', muted: '#6b7280', border: '#e9d5ff' },
    layout: 'grid-heavy',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'family-clinic',
    name: 'Family Clinic',
    cssFile: 'family-clinic.css',
    category: 'medical',
    personality: 'Warm, welcoming, pediatric-friendly.',
    fonts: { heading: 'Poppins', body: 'Outfit', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&family=Outfit:wght@300;400;500&display=swap' },
    colors: { bg: '#fff7ed', surface: '#ffffff', primary: '#ea580c', secondary: '#f97316', text: '#431407', muted: '#78716c', border: '#fed7aa' },
    layout: 'centered',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'mental-health-calm',
    name: 'Mental Health Calm',
    cssFile: 'mental-health-calm.css',
    category: 'medical',
    personality: 'Soft blues and lavenders, breathing room, supportive.',
    fonts: { heading: 'Outfit', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#f5f3ff', surface: '#ffffff', primary: '#6366f1', secondary: '#8b5cf6', text: '#312e81', muted: '#6b7280', border: '#ddd6fe' },
    layout: 'single-column',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
];

export function getRandomMedicalTheme(): WebsiteTheme {
  return MEDICAL_THEMES[Math.floor(Math.random() * MEDICAL_THEMES.length)];
}
