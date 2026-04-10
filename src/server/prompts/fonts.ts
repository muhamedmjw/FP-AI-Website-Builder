// src/server/prompts/fonts.ts

export const FONTS = {
  playfairDisplay:  { name: "Playfair Display",  url: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap" },
  bebasNeue:        { name: "Bebas Neue",         url: "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" },
  dmSerifDisplay:   { name: "DM Serif Display",   url: "https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap" },
  syne:             { name: "Syne",               url: "https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&display=swap" },
  josefinSans:      { name: "Josefin Sans",       url: "https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;700&display=swap" },
  cormorantGaramond:{ name: "Cormorant Garamond", url: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;700&display=swap" },
  outfit:           { name: "Outfit",             url: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700&display=swap" },
  unbounded:        { name: "Unbounded",          url: "https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700;900&display=swap" },
  libreBaskerville: { name: "Libre Baskerville",  url: "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap" },
  rajdhani:         { name: "Rajdhani",           url: "https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&display=swap" },
  cinzel:           { name: "Cinzel",             url: "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap" },
  exo2:             { name: "Exo 2",              url: "https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;700&display=swap" },
  instrumentSerif:  { name: "Instrument Serif",   url: "https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap" },
  spaceGrotesk:     { name: "Space Grotesk",      url: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;700&display=swap" },
  clashDisplay:     { name: "Clash Display",      url: "https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;600;700&display=swap" },
  inter:            { name: "Inter",              url: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" },
  manrope:          { name: "Manrope",            url: "https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;700&display=swap" },
  plusJakartaSans:  { name: "Plus Jakarta Sans",  url: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700&display=swap" },
  poppins:          { name: "Poppins",            url: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" },
  montserrat:       { name: "Montserrat",         url: "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&display=swap" },
  lora:             { name: "Lora",               url: "https://fonts.googleapis.com/css2?family=Lora:wght@400;500;700&display=swap" },
  workSans:         { name: "Work Sans",          url: "https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;700&display=swap" },
} as const;

export type FontKey = keyof typeof FONTS;
