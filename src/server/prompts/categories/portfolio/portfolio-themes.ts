// src/server/prompts/categories/portfolio/portfolio-themes.ts
import type { WebsiteTheme } from '../../theme-types';

export const PORTFOLIO_THEMES: WebsiteTheme[] = [
  {
    id: 'neon-cyber',
    name: 'Neon Cyber',
    cssFile: 'neon-cyber.css',
    category: 'portfolio',
    personality: 'Bold and electric. Glowing edges. Dark backgrounds. Futuristic hacker energy.',
    fonts: { heading: 'Unbounded', body: 'Space Grotesk', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700;900&family=Space+Grotesk:wght@300;400;700&display=swap' },
    colors: { bg: '#0a0a0f', surface: '#111118', primary: '#00fff5', secondary: '#ff00aa', text: '#e8e8ff', muted: '#555577', border: 'rgba(0,255,245,0.2)' },
    layout: 'asymmetric',
    animations: ['fadeUp', 'glowPulse', 'scanIn'],
    jsFeatures: ['typewriter', 'cursorGlow'],
    rtlSafe: true,
  },
  {
    id: 'editorial-magazine',
    name: 'Editorial Magazine',
    cssFile: 'editorial-magazine.css',
    category: 'portfolio',
    personality: 'Sophisticated newspaper energy. Big serif type. Black, cream, and one pop of red.',
    fonts: { heading: 'DM Serif Display', body: 'Libre Baskerville', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Libre+Baskerville:wght@400;700&display=swap' },
    colors: { bg: '#f5f2eb', surface: '#ffffff', primary: '#c8392b', secondary: '#1a1a1a', text: '#1a1a1a', muted: '#7a7060', border: '#d4cfc4' },
    layout: 'newspaper',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'minimal-zen',
    name: 'Minimal Zen',
    cssFile: 'minimal-zen.css',
    category: 'portfolio',
    personality: 'Breathing room. Nothing wasted. Green accent on a cream canvas.',
    fonts: { heading: 'Instrument Serif', body: 'Outfit', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Outfit:wght@300;400;500&display=swap' },
    colors: { bg: '#fafaf8', surface: '#f0efe9', primary: '#2d6a4f', secondary: '#1c1c1c', text: '#2a2a2a', muted: '#888880', border: '#e2e0d8' },
    layout: 'single-column',
    animations: ['fadeUp'],
    jsFeatures: [],
    rtlSafe: true,
  },
  {
    id: 'retro-80s',
    name: 'Retro 80s',
    cssFile: 'retro-80s.css',
    category: 'portfolio',
    personality: 'VHS glitch era. Neon pinks and yellows on deep purple. Grid floors and chrome.',
    fonts: { heading: 'Bebas Neue', body: 'Outfit', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@400;700&display=swap' },
    colors: { bg: '#0d0015', surface: '#1a0028', primary: '#ff006e', secondary: '#ffbe0b', text: '#f8f0ff', muted: '#9966cc', border: 'rgba(255,0,110,0.3)' },
    layout: 'full-bleed',
    animations: ['fadeUp'],
    jsFeatures: ['cursorTrail'],
    rtlSafe: true,
  },
  {
    id: 'luxury-dark',
    name: 'Luxury Dark',
    cssFile: 'luxury-dark.css',
    category: 'portfolio',
    personality: 'Cinema meets fashion editorial. Gold on near-black. Barely-there grain texture.',
    fonts: { heading: 'Cormorant Garamond', body: 'Josefin Sans', googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;700&family=Josefin+Sans:wght@300;400&display=swap' },
    colors: { bg: '#080808', surface: '#101010', primary: '#c9a84c', secondary: '#e8e0d0', text: '#c8c0b0', muted: '#5a5248', border: 'rgba(201,168,76,0.2)' },
    layout: 'full-bleed',
    animations: ['fadeUp'],
    jsFeatures: ['parallax'],
    rtlSafe: true,
  },
];

export function getRandomPortfolioTheme(): WebsiteTheme {
  return PORTFOLIO_THEMES[Math.floor(Math.random() * PORTFOLIO_THEMES.length)];
}
