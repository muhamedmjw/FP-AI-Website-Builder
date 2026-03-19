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
input, textarea, button, select { font-family: inherit; }

/* === CSS VARIABLES === */
:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --primary-light: rgba(99,102,241,0.12);
  --primary-glow: rgba(99,102,241,0.30);
  --secondary: #ec4899;
  --bg: #0f0f13;
  --bg-alt: #13131a;
  --bg-card: #1a1a24;
  --bg-card-hover: #20202c;
  --text: #f0f0f5;
  --text-muted: #9090a8;
  --text-subtle: #55556a;
  --border: rgba(255,255,255,0.07);
  --border-hover: rgba(255,255,255,0.14);
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
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--text);
}
h1 { font-size: clamp(2.8rem, 5vw, 4.5rem); }
h2 { font-size: clamp(2rem, 3.5vw, 3rem); }
h3 { font-size: 1.3rem; font-weight: 600; }
h4 { font-size: 1.05rem; font-weight: 600; }
p { color: var(--text-muted); line-height: 1.8; font-size: 1rem; }

/* GRADIENT TEXT — only apply to a single word or short phrase */
.gradient-text {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: inline;
}

/* === LAYOUT === */
.container {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 40px;
  width: 100%;
}
@media(max-width: 768px) { .container { padding: 0 20px; } }
section { padding: 100px 0; position: relative; overflow: hidden; }

/* === NAVBAR === */
nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 1000;
  height: 72px;
  display: flex;
  align-items: center;
  background: rgba(15,15,19,0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
}
nav .nav-inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 40px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nav-logo {
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 800;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
}
.nav-links {
  display: flex;
  align-items: center;
  gap: 4px;
  list-style: none;
}
.nav-links a {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-muted);
  transition: var(--transition-fast);
  white-space: nowrap;
}
.nav-links a:hover { color: var(--text); background: rgba(255,255,255,0.06); }
.nav-cta {
  background: var(--gradient-primary) !important;
  -webkit-text-fill-color: #fff !important;
  color: #fff !important;
  padding: 9px 22px !important;
  border-radius: 50px !important;
  font-weight: 600 !important;
  font-size: 0.88rem !important;
  box-shadow: 0 0 20px var(--primary-glow);
  transition: var(--transition) !important;
}
.nav-cta:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 0 30px var(--primary-glow) !important;
  background: rgba(255,255,255,0.06) !important;
}
.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  color: var(--text);
  cursor: pointer;
  padding: 8px;
  font-size: 1.4rem;
  line-height: 1;
}

/* === HERO === */
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  padding-top: 72px;
}
.hero-overlay {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.hero-content {
  position: relative;
  z-index: 2;
  max-width: 680px;
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(99,102,241,0.12);
  border: 1px solid rgba(99,102,241,0.25);
  border-radius: 50px;
  padding: 6px 16px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #a5b4fc;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 28px;
}
.hero h1 {
  margin-bottom: 20px;
  color: #ffffff;
}
.hero p.hero-subtitle {
  font-size: 1.1rem;
  margin-bottom: 36px;
  max-width: 520px;
  color: rgba(255,255,255,0.65);
  line-height: 1.75;
}
.hero-buttons {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  align-items: center;
}

/* === BUTTONS === */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 28px;
  font-size: 0.92rem;
  font-weight: 600;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: var(--transition);
  text-decoration: none;
  white-space: nowrap;
  position: relative;
}
.btn-primary {
  background: var(--gradient-primary);
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
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
  -webkit-text-fill-color: var(--text);
  border: 1.5px solid var(--border-hover);
}
.btn-outline:hover {
  border-color: var(--primary);
  color: var(--primary);
  -webkit-text-fill-color: var(--primary);
  transform: translateY(-2px);
}
.btn-lg { padding: 15px 36px; font-size: 1rem; }
.btn-sm { padding: 9px 20px; font-size: 0.83rem; }

/* === SECTION HEADERS === */
.section-header {
  text-align: center;
  margin-bottom: 60px;
}
.section-header .eyebrow {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--primary);
  background: var(--primary-light);
  border: 1px solid rgba(99,102,241,0.2);
  padding: 5px 14px;
  border-radius: 50px;
  margin-bottom: 16px;
}
.section-header h2 { margin-bottom: 14px; }
.section-header p {
  max-width: 520px;
  margin: 0 auto;
  font-size: 1.05rem;
  color: var(--text-muted);
}

/* === CARDS === */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 32px;
  transition: var(--transition);
  position: relative;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.card::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: var(--gradient-primary);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
}
.card:hover {
  border-color: var(--border-hover);
  background: var(--bg-card-hover);
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg);
}
.card:hover::after { transform: scaleX(1); }
.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--primary-light);
  border: 1px solid rgba(99,102,241,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  color: #a5b4fc;
  flex-shrink: 0;
}
.card h3 { font-size: 1.1rem; color: var(--text); margin: 0; }
.card p { font-size: 0.93rem; color: var(--text-muted); line-height: 1.7; margin: 0; flex: 1; }

/* === GRIDS === */
.grid-2 { display: grid; grid-template-columns: repeat(2,1fr); gap: 24px; }
.grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; }
.grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 20px; }
.grid-auto { display: grid; grid-template-columns: repeat(auto-fit,minmax(280px,1fr)); gap: 24px; }

/* === STATS BAR === */
.stats-section {
  background: var(--bg-alt);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 60px 0;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 20px;
  text-align: center;
}
.stat-item { padding: 24px 16px; }
.stat-number {
  font-family: var(--font-display);
  font-size: 2.6rem;
  font-weight: 800;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin-bottom: 8px;
  display: block;
}
.stat-label {
  font-size: 0.88rem;
  color: var(--text-muted);
  font-weight: 500;
}

/* === TESTIMONIALS === */
.testimonial-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  transition: var(--transition);
}
.testimonial-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}
.stars { color: #fbbf24; font-size: 0.9rem; letter-spacing: 2px; margin-bottom: 4px; }
.testimonial-text {
  font-size: 0.97rem;
  color: var(--text);
  line-height: 1.75;
  flex: 1;
  font-style: italic;
}
.testimonial-author {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}
.testimonial-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border-hover);
  flex-shrink: 0;
}
.testimonial-name { font-weight: 600; color: var(--text); font-size: 0.92rem; }
.testimonial-role { font-size: 0.78rem; color: var(--text-muted); margin-top: 2px; }

/* === PRICING === */
.pricing-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; align-items: start; }
.pricing-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 36px;
  transition: var(--transition);
  position: relative;
}
.pricing-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); }
.pricing-card.featured {
  border-color: var(--primary);
  background: linear-gradient(180deg, rgba(99,102,241,0.08) 0%, var(--bg-card) 60%);
  box-shadow: 0 0 40px rgba(99,102,241,0.12);
}
.pricing-badge {
  position: absolute;
  top: -13px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--gradient-primary);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 18px;
  border-radius: 50px;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.pricing-name {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  margin-bottom: 12px;
}
.price {
  font-size: 3rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1;
  margin-bottom: 6px;
}
.price-period { font-size: 0.9rem; color: var(--text-muted); margin-bottom: 24px; }
.pricing-divider { height: 1px; background: var(--border); margin: 20px 0; }
.pricing-features { list-style: none; margin-bottom: 28px; }
.pricing-features li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  font-size: 0.9rem;
  color: var(--text-muted);
}
.pricing-features li i.fa-check { color: #4ade80; }
.pricing-features li i.fa-times { color: var(--text-subtle); }

/* === CONTACT FORM === */
.contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: start; }
.contact-info h3 { font-size: 1.5rem; margin-bottom: 16px; }
.contact-info p { margin-bottom: 28px; }
.contact-detail {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  font-size: 0.93rem;
  color: var(--text-muted);
}
.contact-detail i {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a5b4fc;
  font-size: 0.9rem;
  flex-shrink: 0;
}
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { margin-bottom: 16px; }
.form-label {
  display: block;
  font-size: 0.83rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 7px;
  letter-spacing: 0.02em;
}
.form-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 0.92rem;
  transition: var(--transition-fast);
  outline: none;
}
.form-input::placeholder { color: var(--text-subtle); }
.form-input:focus {
  border-color: var(--primary);
  background: var(--bg-card);
  box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
}
textarea.form-input { resize: vertical; min-height: 130px; }

/* === FOOTER === */
footer {
  background: var(--bg-alt);
  border-top: 1px solid var(--border);
  padding: 80px 0 0;
}
.footer-grid {
  display: grid;
  grid-template-columns: 1.6fr repeat(3,1fr);
  gap: 48px;
  margin-bottom: 60px;
}
.footer-brand .nav-logo { font-size: 1.2rem; margin-bottom: 14px; display: block; }
.footer-brand p { font-size: 0.9rem; max-width: 260px; line-height: 1.7; }
.footer-title {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text);
  margin-bottom: 18px;
}
.footer-links { display: flex; flex-direction: column; gap: 10px; }
.footer-links a {
  font-size: 0.88rem;
  color: var(--text-muted);
  transition: var(--transition-fast);
  display: inline-block;
}
.footer-links a:hover { color: var(--primary); transform: translateX(4px); }
.footer-bottom {
  padding: 24px 0;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.83rem;
  color: var(--text-subtle);
}
.social-links { display: flex; gap: 10px; }
.social-link {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 0.85rem;
  transition: var(--transition-fast);
  text-decoration: none;
}
.social-link:hover {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  transform: translateY(-2px);
}

/* === ANIMATIONS === */
.fade-up {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.65s ease, transform 0.65s ease;
}
.fade-up.visible { opacity: 1; transform: translateY(0); }

/* === SCROLLBAR === */
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border-hover); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--primary); }

/* === RESPONSIVE === */
@media (max-width: 1024px) {
  .grid-4 { grid-template-columns: repeat(2,1fr); }
  .stats-grid { grid-template-columns: repeat(2,1fr); }
  .footer-grid { grid-template-columns: repeat(2,1fr); gap: 32px; }
  .contact-grid { grid-template-columns: 1fr; gap: 40px; }
}
@media (max-width: 768px) {
  section { padding: 70px 0; }
  .grid-2, .grid-3, .pricing-grid { grid-template-columns: 1fr; }
  .hero-buttons { flex-direction: column; align-items: flex-start; }
  .hero-buttons .btn { width: 100%; justify-content: center; }
  .nav-links { display: none; }
  .nav-links.open {
    display: flex;
    flex-direction: column;
    position: fixed;
    inset: 72px 0 0 0;
    background: rgba(15,15,19,0.98);
    backdrop-filter: blur(24px);
    padding: 40px 24px;
    gap: 6px;
    z-index: 999;
    align-items: flex-start;
  }
  .nav-links.open li { width: 100%; }
  .nav-links.open a {
    display: block;
    font-size: 1.1rem;
    padding: 14px 16px;
    width: 100%;
  }
  .mobile-menu-btn { display: flex; align-items: center; justify-content: center; }
  .footer-grid { grid-template-columns: 1fr; gap: 28px; }
  .footer-bottom { flex-direction: column; gap: 14px; text-align: center; }
  .form-row { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: repeat(2,1fr); }
}
`.trim();
