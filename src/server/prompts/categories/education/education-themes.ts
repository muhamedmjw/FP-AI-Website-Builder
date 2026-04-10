// src/server/prompts/categories/education/education-themes.ts
import type { WebsiteTheme } from '../../theme-types';

export const EDUCATION_THEMES: WebsiteTheme[] = [
  {
    id: 'campus-classic',
    name: 'Campus Classic',
    cssFile: 'campus-classic.css',
    category: 'education',
    personality: 'University traditional, maroon or navy, academic feel.',
    fonts: { heading: 'Libre Baskerville', body: 'Libre Baskerville', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap' },
    colors: { bg: '#fafaf9', surface: '#ffffff', primary: '#7f1d1d', secondary: '#b45309', text: '#1c1917', muted: '#57534e', border: '#e7e5e4' },
    layout: 'sidebar',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'edtech-modern',
    name: 'EdTech Modern',
    cssFile: 'edtech-modern.css',
    category: 'education',
    personality: 'Bright, gamified, progress tracking, engaging.',
    fonts: { heading: 'Poppins', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#ffffff', surface: '#f0f9ff', primary: '#0284c7', secondary: '#22d3ee', text: '#0c4a6e', muted: '#0e7490', border: '#bae6fd' },
    layout: 'grid-heavy',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'kids-learning',
    name: 'Kids Learning',
    cssFile: 'kids-learning.css',
    category: 'education',
    personality: 'Colorful, rounded, friendly illustrations feel.',
    fonts: { heading: 'Poppins', body: 'Outfit', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&family=Outfit:wght@300;400;500&display=swap' },
    colors: { bg: '#fef3c7', surface: '#ffffff', primary: '#f59e0b', secondary: '#ec4899', text: '#451a03', muted: '#92400e', border: '#fde68a' },
    layout: 'centered',
    animations: ['fadeUp', 'bounceIn'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'professional-training',
    name: 'Professional Training',
    cssFile: 'professional-training.css',
    category: 'education',
    personality: 'Corporate, certification focused, career growth.',
    fonts: { heading: 'Inter', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap' },
    colors: { bg: '#ffffff', surface: '#f8fafc', primary: '#0f172a', secondary: '#3b82f6', text: '#1e293b', muted: '#64748b', border: '#e2e8f0' },
    layout: 'sidebar',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'indie-course',
    name: 'Indie Course',
    cssFile: 'indie-course.css',
    category: 'education',
    personality: 'Personal, creator-led, community learning.',
    fonts: { heading: 'Outfit', body: 'Inter', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&family=Inter:wght@300;400;500&display=swap' },
    colors: { bg: '#faf5ff', surface: '#ffffff', primary: '#7c3aed', secondary: '#a855f7', text: '#3b0764', muted: '#6b7280', border: '#e9d5ff' },
    layout: 'single-column',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
];

export function getRandomEducationTheme(): WebsiteTheme {
  return EDUCATION_THEMES[Math.floor(Math.random() * EDUCATION_THEMES.length)];
}
