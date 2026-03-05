/**
 * Base CSS template — the exact CSS that every AI-generated website MUST include.
 * This ensures visual consistency across all generated websites.
 */
export const BASE_CSS = `
/* === RESET === */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; font-size: 16px; }
img { max-width: 100%; height: auto; display: block; }
a { text-decoration: none; color: inherit; }
ul, ol { list-style: none; }
input, textarea, button { font-family: inherit; }

/* === CSS VARIABLES === */
:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --primary-light: #e0e7ff;
  --primary-glow: rgba(99,102,241,0.35);
  --secondary: #ec4899;
  --accent: #f59e0b;
  --bg: #0f0f13;
  --bg-alt: #16161d;
  --bg-card: #1e1e2a;
  --bg-card-hover: #252534;
  --text: #f0f0f5;
  --text-muted: #8b8ba7;
  --text-subtle: #555570;
  --border: rgba(255,255,255,0.08);
  --border-hover: rgba(255,255,255,0.16);
  --radius: 16px;
  --radius-sm: 10px;
  --radius-lg: 24px;
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.3);
  --shadow-md: 0 8px 32px rgba(0,0,0,0.4);
  --shadow-lg: 0 20px 60px rgba(0,0,0,0.5);
  --shadow-glow: 0 0 40px var(--primary-glow);
  --gradient-primary: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  --gradient-hero: linear-gradient(135deg, #0f0f13 0%, #1a0a2e 50%, #0d1117 100%);
  --transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
  --transition-fast: all 0.15s ease;
  --font-display: 'Poppins', sans-serif;
  --font-body: 'Inter', sans-serif;
}

/* === BASE === */
body {
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.7;
  color: var(--text);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

/* === TYPOGRAPHY === */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.03em;
  color: var(--text);
}
h1 { font-size: clamp(2.5rem, 6vw, 4.5rem); }
h2 { font-size: clamp(1.8rem, 3.5vw, 3rem); }
h3 { font-size: 1.35rem; font-weight: 600; }
h4 { font-size: 1.1rem; font-weight: 600; }
p { color: var(--text-muted); line-height: 1.8; font-size: 1.05rem; }
.gradient-text {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* === LAYOUT === */
.container { max-width: 1200px; margin: 0 auto; padding: 0 32px; }
@media(max-width:768px){ .container { padding: 0 20px; } }
section { padding: 100px 0; position: relative; }

/* === NAVBAR === */
nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 0;
  background: rgba(15,15,19,0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  transition: var(--transition);
}
nav .nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nav-logo {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 800;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.nav-links {
  display: flex;
  align-items: center;
  gap: 8px;
}
.nav-links a {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-muted);
  transition: var(--transition-fast);
}
.nav-links a:hover {
  color: var(--text);
  background: rgba(255,255,255,0.06);
}
.nav-cta {
  background: var(--gradient-primary) !important;
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
  padding: 9px 22px !important;
  border-radius: 50px !important;
  font-weight: 600 !important;
  box-shadow: 0 0 20px var(--primary-glow);
}
.nav-cta:hover { transform: translateY(-1px); box-shadow: 0 0 30px var(--primary-glow) !important; }
.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  color: var(--text);
  cursor: pointer;
  padding: 8px;
  font-size: 1.5rem;
}

/* === HERO === */
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  background: var(--gradient-hero);
  position: relative;
  overflow: hidden;
  padding-top: 70px;
}
.hero::before {
  content: '';
  position: absolute;
  top: -30%;
  left: -20%;
  width: 80%;
  height: 80%;
  background: radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%);
  pointer-events: none;
}
.hero::after {
  content: '';
  position: absolute;
  bottom: -20%;
  right: -10%;
  width: 60%;
  height: 60%;
  background: radial-gradient(ellipse, rgba(236,72,153,0.1) 0%, transparent 70%);
  pointer-events: none;
}
.hero-content {
  position: relative;
  z-index: 1;
  max-width: 700px;
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(99,102,241,0.12);
  border: 1px solid rgba(99,102,241,0.25);
  border-radius: 50px;
  padding: 6px 16px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #a5b4fc;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 28px;
}
.hero h1 { margin-bottom: 24px; color: #fff; }
.hero p { font-size: 1.2rem; margin-bottom: 40px; max-width: 560px; color: var(--text-muted); }
.hero-buttons { display: flex; gap: 16px; flex-wrap: wrap; }

/* === BUTTONS === */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 32px;
  font-size: 0.95rem;
  font-weight: 600;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: var(--transition);
  position: relative;
  overflow: hidden;
  text-decoration: none;
}
.btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0);
  transition: var(--transition-fast);
}
.btn:hover::after { background: rgba(255,255,255,0.08); }
.btn-primary {
  background: var(--gradient-primary);
  color: #fff;
  box-shadow: 0 4px 20px var(--primary-glow);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px var(--primary-glow);
}
.btn-primary:active { transform: translateY(0); }
.btn-outline {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border-hover);
}
.btn-outline:hover {
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-2px);
}
.btn-lg { padding: 16px 40px; font-size: 1.05rem; }
.btn-sm { padding: 10px 22px; font-size: 0.875rem; }

/* === SECTION HEADERS === */
.section-header { text-align: center; margin-bottom: 64px; }
.section-header .eyebrow {
  display: inline-block;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--primary);
  background: rgba(99,102,241,0.1);
  border: 1px solid rgba(99,102,241,0.2);
  padding: 4px 14px;
  border-radius: 50px;
  margin-bottom: 16px;
}
.section-header h2 { margin-bottom: 16px; }
.section-header p { max-width: 560px; margin: 0 auto; font-size: 1.1rem; }

/* === CARDS === */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 36px;
  transition: var(--transition);
  position: relative;
  overflow: hidden;
}
.card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent);
  opacity: 0;
  transition: var(--transition);
}
.card:hover {
  border-color: var(--border-hover);
  background: var(--bg-card-hover);
  transform: translateY(-6px);
  box-shadow: var(--shadow-lg);
}
.card:hover::before { opacity: 1; }
.card-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: rgba(99,102,241,0.12);
  border: 1px solid rgba(99,102,241,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  margin-bottom: 20px;
  color: #a5b4fc;
}

/* === GRIDS === */
.grid-2 { display: grid; grid-template-columns: repeat(2,1fr); gap: 28px; }
.grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 28px; }
.grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 24px; }
.grid-auto { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px,1fr)); gap: 28px; }

/* === GALLERY === */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 16px;
}
.gallery-item {
  position: relative;
  border-radius: var(--radius-sm);
  overflow: hidden;
  aspect-ratio: 4/3;
  background: var(--bg-card);
  border: 1px solid var(--border);
  cursor: pointer;
}
.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: var(--transition);
  border-radius: 0;
}
.gallery-item:hover img { transform: scale(1.08); }
.gallery-item .overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%);
  opacity: 0;
  transition: var(--transition);
  display: flex;
  align-items: flex-end;
  padding: 20px;
}
.gallery-item:hover .overlay { opacity: 1; }

/* === STATS === */
.stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 24px; text-align: center; }
.stat-item { padding: 32px 20px; }
.stat-number {
  font-family: var(--font-display);
  font-size: 2.8rem;
  font-weight: 800;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin-bottom: 8px;
}
.stat-label { font-size: 0.9rem; color: var(--text-muted); font-weight: 500; }

/* === TESTIMONIALS === */
.testimonial-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 36px;
  position: relative;
}
.testimonial-card::before {
  content: '"';
  position: absolute;
  top: 20px; right: 28px;
  font-size: 5rem;
  line-height: 1;
  font-family: Georgia, serif;
  color: rgba(99,102,241,0.15);
}
.testimonial-text { font-size: 1.05rem; color: var(--text); line-height: 1.8; margin-bottom: 24px; }
.testimonial-author { display: flex; align-items: center; gap: 14px; }
.testimonial-avatar {
  width: 48px; height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border);
}
.testimonial-name { font-weight: 600; color: var(--text); font-size: 0.95rem; }
.testimonial-role { font-size: 0.8rem; color: var(--text-muted); }

/* === PRICING === */
.pricing-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 40px;
  transition: var(--transition);
}
.pricing-card.featured {
  border-color: var(--primary);
  background: linear-gradient(180deg, rgba(99,102,241,0.08) 0%, var(--bg-card) 100%);
  box-shadow: 0 0 40px rgba(99,102,241,0.15);
  position: relative;
}
.pricing-badge {
  position: absolute;
  top: -12px; left: 50%;
  transform: translateX(-50%);
  background: var(--gradient-primary);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 16px;
  border-radius: 50px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.price { font-size: 3.5rem; font-weight: 800; color: var(--text); line-height: 1; }
.price span { font-size: 1rem; color: var(--text-muted); font-weight: 400; }
.pricing-features { list-style: none; margin: 28px 0; }
.pricing-features li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.95rem;
  color: var(--text-muted);
}
.pricing-features li:last-child { border-bottom: none; }
.pricing-features li i { color: #4ade80; font-size: 0.875rem; }

/* === CONTACT FORM === */
.form-group { margin-bottom: 20px; }
.form-label { display: block; font-size: 0.875rem; font-weight: 600; color: var(--text); margin-bottom: 8px; }
.form-input {
  width: 100%;
  padding: 14px 18px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 0.95rem;
  transition: var(--transition-fast);
  outline: none;
}
.form-input::placeholder { color: var(--text-subtle); }
.form-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
textarea.form-input { resize: vertical; min-height: 140px; }

/* === FOOTER === */
footer {
  background: var(--bg-alt);
  border-top: 1px solid var(--border);
  padding: 72px 0 32px;
}
.footer-grid { display: grid; grid-template-columns: 1.5fr repeat(3,1fr); gap: 48px; margin-bottom: 56px; }
.footer-brand p { margin-top: 16px; font-size: 0.95rem; max-width: 280px; }
.footer-title { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text); margin-bottom: 20px; }
.footer-links { display: flex; flex-direction: column; gap: 10px; }
.footer-links a { font-size: 0.9rem; color: var(--text-muted); transition: var(--transition-fast); }
.footer-links a:hover { color: var(--primary); transform: translateX(4px); }
.footer-bottom {
  padding-top: 32px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--text-subtle);
}
.social-links { display: flex; gap: 12px; }
.social-link {
  width: 38px; height: 38px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: var(--transition-fast);
  font-size: 0.9rem;
}
.social-link:hover {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  transform: translateY(-2px);
}

/* === DIVIDERS === */
.section-divider {
  width: 60px;
  height: 3px;
  background: var(--gradient-primary);
  border-radius: 2px;
  margin: 0 auto 32px;
}

/* === BADGE / TAG === */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(99,102,241,0.1);
  border: 1px solid rgba(99,102,241,0.2);
  color: #a5b4fc;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 50px;
}

/* === ANIMATIONS === */
.fade-up { opacity: 0; transform: translateY(30px); transition: opacity 0.7s ease, transform 0.7s ease; }
.fade-up.visible { opacity: 1; transform: translateY(0); }
.fade-in { opacity: 0; transition: opacity 0.7s ease; }
.fade-in.visible { opacity: 1; }

/* === SCROLLBAR === */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border-hover); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--primary); }

/* === RESPONSIVE === */
@media (max-width: 1024px) {
  .grid-4 { grid-template-columns: repeat(2,1fr); }
  .stats-grid { grid-template-columns: repeat(2,1fr); }
  .footer-grid { grid-template-columns: repeat(2,1fr); }
}
@media (max-width: 768px) {
  section { padding: 64px 0; }
  h1 { font-size: 2.4rem; }
  h2 { font-size: 1.8rem; }
  .grid-2, .grid-3, .gallery-grid { grid-template-columns: 1fr; }
  .hero-buttons { flex-direction: column; }
  .nav-links { display: none; }
  .nav-links.open {
    display: flex;
    flex-direction: column;
    position: fixed;
    inset: 70px 0 0 0;
    background: rgba(15,15,19,0.98);
    backdrop-filter: blur(20px);
    padding: 40px 32px;
    gap: 8px;
    z-index: 999;
  }
  .nav-links.open a { font-size: 1.1rem; padding: 14px 16px; }
  .mobile-menu-btn { display: flex; align-items: center; }
  .footer-grid { grid-template-columns: 1fr; gap: 32px; }
  .footer-bottom { flex-direction: column; gap: 16px; text-align: center; }
}
`.trim() as string;
