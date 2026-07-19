export function hsv2hex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
  };
  return `#${f(5).toString(16).padStart(2, '0')}${f(3).toString(16).padStart(2, '0')}${f(1).toString(16).padStart(2, '0')}`;
}

export function hex2hsv(hex: string): [number, number, number] {
  const h = hex.replace('#', '').padEnd(6, '0');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;
  let hue = 0;
  if (d !== 0) {
    if (max === r)      hue = ((g - b) / d % 6) * 60;
    else if (max === g) hue = ((b - r) / d + 2) * 60;
    else                hue = ((r - g) / d + 4) * 60;
    if (hue < 0) hue += 360;
  }
  return [hue, s, v];
}

export function darkenHex(hex: string, factor = 0.45): string {
  const h = hex.replace('#', '');
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - factor));
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - factor));
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - factor));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function mixHex(a: string, b: string, t: number): string {
  const ha = a.replace('#', '').padEnd(6, '0');
  const hb = b.replace('#', '').padEnd(6, '0');
  const r  = Math.round(parseInt(ha.slice(0, 2), 16) * (1 - t) + parseInt(hb.slice(0, 2), 16) * t);
  const g  = Math.round(parseInt(ha.slice(2, 4), 16) * (1 - t) + parseInt(hb.slice(2, 4), 16) * t);
  const bl = Math.round(parseInt(ha.slice(4, 6), 16) * (1 - t) + parseInt(hb.slice(4, 6), 16) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}

export function lightenHex(hex: string, factor = 0.2): string {
  const h = hex.replace('#', '');
  const r = Math.min(255, Math.round(parseInt(h.slice(0, 2), 16) + (255 - parseInt(h.slice(0, 2), 16)) * factor));
  const g = Math.min(255, Math.round(parseInt(h.slice(2, 4), 16) + (255 - parseInt(h.slice(2, 4), 16)) * factor));
  const b = Math.min(255, Math.round(parseInt(h.slice(4, 6), 16) + (255 - parseInt(h.slice(4, 6), 16)) * factor));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function generateGradient(hex: string): string {
  return `linear-gradient(135deg, ${darkenHex(hex, 0.5)} 0%, ${hex} 50%, ${darkenHex(hex, 0.35)} 100%)`;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').padEnd(6, '0');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Standard broadcast luminance (0–255): Y = 0.299R + 0.587G + 0.114B */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function hex2hsl(hex: string): [number, number, number] {
  const [rr, gg, bb] = hexToRgb(hex);
  const r = rr / 255, g = gg / 255, b = bb / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else                h = ((r - g) / d + 4) * 60;
  return [h, s * 100, l * 100];
}

export function hsl2hex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.max(0, Math.min(100, s)) / 100;
  const ll = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs((hh / 60) % 2 - 1));
  const m = ll - c / 2;
  let r = 0, g = 0, b = 0;
  if      (hh < 60)  { r = c; g = x; b = 0; }
  else if (hh < 120) { r = x; g = c; b = 0; }
  else if (hh < 180) { r = 0; g = c; b = x; }
  else if (hh < 240) { r = 0; g = x; b = c; }
  else if (hh < 300) { r = x; g = 0; b = c; }
  else                { r = c; g = 0; b = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** A color plus which theme was active when the user actually picked it. */
export interface AdaptiveColorSource {
  color: string;
  pickedInDark: boolean;
}

// Shift amounts for deriving a light-mode counterpart from a dark-mode
// anchor (and their inverse, for deriving dark from light) — raise
// Lightness / lower Saturation going dark→light, clamped so a near-black or
// near-white input can't collapse to pure black/white or fully gray out.
const ADAPTIVE_L_SHIFT = 32;
const ADAPTIVE_S_SHIFT = 18;
const ADAPTIVE_L_MIN = 8;
const ADAPTIVE_L_MAX = 90;
const ADAPTIVE_S_MIN = 15;

/**
 * Derives the color's counterpart for `isDarkMode` from a single stored
 * anchor color + which theme it was picked under. Exact (no HSL round-trip)
 * when `isDarkMode` matches `source.pickedInDark`; otherwise algorithmically
 * derived — dark→light raises Lightness / lowers Saturation for contrast on
 * a light background, light→dark is the inverse.
 */
export function getAdaptiveColor(source: AdaptiveColorSource, isDarkMode: boolean): string {
  if (isDarkMode === source.pickedInDark) return source.color;
  const [h, s, l] = hex2hsl(source.color);
  if (source.pickedInDark) {
    // dark → light
    return hsl2hex(h, Math.max(ADAPTIVE_S_MIN, s - ADAPTIVE_S_SHIFT), Math.min(ADAPTIVE_L_MAX, l + ADAPTIVE_L_SHIFT));
  }
  // light → dark
  return hsl2hex(h, Math.min(100, s + ADAPTIVE_S_SHIFT), Math.max(ADAPTIVE_L_MIN, l - ADAPTIVE_L_SHIFT));
}
