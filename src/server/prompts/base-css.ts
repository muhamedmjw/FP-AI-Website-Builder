/**
 * Base CSS template — the exact CSS that every AI-generated website MUST include.
 * This ensures visual consistency across all generated websites.
 */
export const BASE_CSS = `
/* === RESET === */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
img { max-width: 100%; height: auto; display: block; }
a { text-decoration: none; color: inherit; }
ul, ol { list-style: none; }

/* === CSS VARIABLES === */
:root {
  --primary: #2563EB;
  --primary-dark: #1E40AF;
  --primary-light: #DBEAFE;
  --accent: #F59E0B;
  --bg: #FFFFFF;
  --bg-alt: #F9FAFB;
  --text: #111827;
  --text-muted: #6B7280;
  --border: #E5E7EB;
  --card-bg: #FFFFFF;
  --footer-bg: #111827;
  --footer-text: #D1D5DB;
  --radius: 12px;
  --radius-sm: 8px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.1);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
  --transition: all 0.3s ease;
}

/* === TYPOGRAPHY === */
body {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: var(--text);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3, h4, h5, h6 {
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--text);
}
h1 { font-size: clamp(2.2rem, 5vw, 3.5rem); }
h2 { font-size: clamp(1.6rem, 3vw, 2.5rem); }
h3 { font-size: 1.25rem; }
p { color: var(--text-muted); line-height: 1.7; }

/* === LAYOUT === */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}
section {
  padding: 80px 0;
}
section:nth-child(even) {
  background: var(--bg-alt);
}

/* === BUTTONS === */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  font-size: 0.95rem;
  font-weight: 600;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--transition);
}
.btn-primary {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 2px 8px rgba(37,99,235,0.3);
}
.btn-primary:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(37,99,235,0.4);
}
.btn-outline {
  background: transparent;
  color: var(--primary);
  border: 2px solid var(--primary);
}
.btn-outline:hover {
  background: var(--primary);
  color: #fff;
}

/* === CARDS === */
.card {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 32px;
  box-shadow: var(--shadow-sm);
  transition: var(--transition);
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

/* === NAVBAR === */
nav {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  padding: 16px 0;
}
nav .container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
nav a { font-weight: 500; transition: color 0.2s; }
nav a:hover { color: var(--primary); }

/* === HERO === */
.hero {
  min-height: 85vh;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, var(--primary-light) 0%, var(--bg) 100%);
}
.hero h1 { margin-bottom: 20px; }
.hero p { font-size: 1.15rem; margin-bottom: 32px; max-width: 600px; }

/* === FOOTER === */
footer {
  background: var(--footer-bg);
  color: var(--footer-text);
  padding: 64px 0 24px;
}
footer a:hover { color: #fff; }

/* === GRID HELPERS === */
.grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }

/* === ANIMATIONS === */
.fade-up {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.fade-up.visible {
  opacity: 1;
  transform: translateY(0);
}

/* === IMAGES === */
img { border-radius: var(--radius); }

/* === RESPONSIVE === */
@media (max-width: 768px) {
  section { padding: 48px 0; }
  .grid-2, .grid-3, .grid-4 {
    grid-template-columns: 1fr;
  }
  .hero { min-height: 70vh; text-align: center; }
  .hero p { margin-left: auto; margin-right: auto; }
  nav .nav-links { display: none; }
  .mobile-menu-btn { display: block; }
}
@media (min-width: 769px) {
  .mobile-menu-btn { display: none; }
}
`.trim() as string;
