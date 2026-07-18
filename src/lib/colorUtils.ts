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
