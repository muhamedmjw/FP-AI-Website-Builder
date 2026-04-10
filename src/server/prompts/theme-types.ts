// src/server/prompts/theme-types.ts

export interface ThemeFont {
  heading: string;
  body: string;
  accent?: string;
  googleFontsUrl: string;
}

export interface ThemeColors {
  bg: string;
  surface: string;
  primary: string;
  secondary: string;
  text: string;
  muted: string;
  border: string;
}

export type LayoutType =
  | 'centered'
  | 'asymmetric'
  | 'grid-heavy'
  | 'full-bleed'
  | 'sidebar'
  | 'magazine'
  | 'masonry'
  | 'split-screen'
  | 'single-column'
  | 'newspaper';

export interface WebsiteTheme {
  id: string;
  name: string;
  cssFile: string;         // e.g. "neon-cyber.css" — AI references this file
  category: string;
  personality: string;
  fonts: ThemeFont;
  colors: ThemeColors;
  layout: LayoutType;
  animations: string[];
  jsFeatures: string[];    // only include in output if theme lists them here
  rtlSafe: boolean;
}
