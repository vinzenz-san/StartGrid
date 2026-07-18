import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useBackground } from '../contexts/BackgroundContext';
import { useSettings } from '../contexts/SettingsContext';
import { PRESETS, type BackgroundConfig } from '../types/background';
import { luminance, mixHex, darkenHex } from '../lib/colorUtils';

const LUMINANCE_THRESHOLD = 160;
const RESIZE_DEBOUNCE_MS  = 180;
const FALLBACK_HEX        = '#0f1117'; // matches each provider's own no-image/no-preset fallback

// ── Offscreen image cache ────────────────────────────────────────────────
// One entry, keyed by url+fit+viewport. The expensive step (decode + draw)
// only re-runs when that key changes; every trigger in between just reads
// already-rendered pixels off the cached canvas.

interface ImgCache {
  url: string;
  fit: 'cover' | 'contain';
  viewportW: number;
  viewportH: number;
  ready: boolean;
  failed: boolean;
  naturalW: number;
  naturalH: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  waiters: Array<(cache: ImgCache) => void>;
}

function ensureImageCache(
  cacheRef: RefObject<ImgCache | null>,
  url: string,
  fit: 'cover' | 'contain',
  cb: (cache: ImgCache) => void,
) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const existing = cacheRef.current;

  if (existing && existing.url === url && existing.fit === fit && existing.viewportW === vw && existing.viewportH === vh) {
    if (existing.ready || existing.failed) { cb(existing); return; }
    existing.waiters.push(cb);
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width  = vw;
  canvas.height = vh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;

  const cache: ImgCache = {
    url, fit, viewportW: vw, viewportH: vh, ready: false, failed: false,
    naturalW: 0, naturalH: 0, scale: 1, offsetX: 0, offsetY: 0, canvas, ctx, waiters: [cb],
  };
  (cacheRef as { current: ImgCache | null }).current = cache;

  const img = new Image();
  img.crossOrigin = 'anonymous'; // required for cross-origin (Unsplash) canvas reads
  img.src = url;

  const finish = (failed: boolean) => {
    if (cacheRef.current !== cache) return; // superseded by a newer request mid-flight
    cache.failed = failed;
    if (!failed) {
      cache.naturalW = img.naturalWidth;
      cache.naturalH = img.naturalHeight;
      if (cache.naturalW && cache.naturalH) {
        const scale = fit === 'cover'
          ? Math.max(vw / cache.naturalW, vh / cache.naturalH)
          : Math.min(vw / cache.naturalW, vh / cache.naturalH);
        const drawnW = cache.naturalW * scale;
        const drawnH = cache.naturalH * scale;
        cache.scale   = scale;
        cache.offsetX = (vw - drawnW) / 2;
        cache.offsetY = (vh - drawnH) / 2;
        try {
          ctx.clearRect(0, 0, vw, vh);
          ctx.drawImage(img, cache.offsetX, cache.offsetY, drawnW, drawnH);
        } catch {
          cache.failed = true; // tainted canvas (CORS)
        }
      } else {
        cache.failed = true;
      }
    }
    cache.ready = true;
    const waiters = cache.waiters;
    cache.waiters = [];
    waiters.forEach(w => w(cache));
  };

  if (typeof img.decode === 'function') {
    img.decode().then(() => finish(false)).catch(() => finish(true));
  } else {
    img.onload  = () => finish(false);
    img.onerror = () => finish(true);
  }
}

function sampleImage(cache: ImgCache, px: number, py: number, letterboxHex: string): number | null {
  if (cache.failed || !cache.naturalW) return null;

  if (cache.fit === 'contain') {
    const drawnW = cache.naturalW * cache.scale;
    const drawnH = cache.naturalH * cache.scale;
    if (px < cache.offsetX || px > cache.offsetX + drawnW || py < cache.offsetY || py > cache.offsetY + drawnH) {
      return luminance(letterboxHex); // point falls in the letterbox bars, not the image
    }
  }

  try {
    const x = Math.max(0, Math.min(cache.canvas.width  - 1, Math.round(px)));
    const y = Math.max(0, Math.min(cache.canvas.height - 1, Math.round(py)));
    const [r, g, b] = cache.ctx.getImageData(x, y, 1, 1).data;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  } catch {
    return null; // tainted canvas — caller falls back to a safe default
  }
}

// ── Analytic path (preset / color / gradient / flat hex) ────────────────
// All three non-image modes resolve to either a flat hex or a fixed 2-stop
// 135deg linear-gradient (see providers/preset.ts + color.ts) — cheap to
// reproduce directly from config, no canvas involved.

function gradientPositionT(cx: number, cy: number): number {
  // Approximates where (cx, cy) falls along a 135deg gradient axis
  // (top-left → bottom-right). Good enough for a contrast decision; exact
  // CSS gradient-line geometry for non-square boxes isn't needed here.
  const t = (cx / window.innerWidth + cy / window.innerHeight) / 2;
  return Math.max(0, Math.min(1, t));
}

function getAnalyticLuminance(
  config: BackgroundConfig,
  isDark: boolean,
  cx: number,
  cy: number,
  backgroundCss: string,
): number {
  let stops: [string, string] | null = null;

  if (config.mode === 'preset') {
    const preset = PRESETS.find(p => p.id === config.value);
    if (preset) {
      const intensity = config.gradientIntensity ?? 100;
      const t = Math.max(0, Math.min(100, intensity)) / 100;
      const [start, end] = isDark ? [preset.darkStart, preset.darkEnd] : [preset.lightStart, preset.lightEnd];
      const blendedStart = t === 0 ? end : mixHex(end, start, t);
      stops = [blendedStart, end];
    }
  } else if (config.customColor) {
    const intensity = config.gradientIntensity ?? (config.customGradient === false ? 0 : 100);
    const t = intensity / 100;
    const blendedEnd = mixHex(config.customColor, darkenHex(config.customColor), t);
    stops = [config.customColor, blendedEnd];
  } else if (/^#[0-9a-fA-F]{6}$/.test(config.value)) {
    return luminance(config.value);
  }

  if (stops) {
    const t2 = gradientPositionT(cx, cy);
    return luminance(mixHex(stops[0], stops[1], t2));
  }

  // Fallback for any shape not specifically modeled above — average any
  // hex colors found in the already-resolved CSS string.
  const hexes = backgroundCss.match(/#[0-9a-fA-F]{6}/g);
  if (hexes && hexes.length) {
    return hexes.reduce((sum, h) => sum + luminance(h), 0) / hexes.length;
  }
  return luminance(FALLBACK_HEX);
}

// ── Hook ──────────────────────────────────────────────────────────────────

/**
 * Samples the background color/image directly under a floating button's
 * current position and returns whether it needs the "dark" (black) icon
 * variant for contrast. Re-samples only on mount, background config change,
 * position change, and a debounced window resize — never on scroll/drag,
 * since the button is `position: fixed` and doesn't move on scroll.
 */
export function useBackgroundContrast(buttonRef: RefObject<HTMLElement | null>): boolean {
  const { config, customImageUrl, backgroundCss, unsplash } = useBackground();
  const { colorScheme, ignoreGlobalThemeSwap, settingsButtonPosition } = useSettings();
  const isDark = ignoreGlobalThemeSwap ? true : colorScheme !== 'light';

  const [isDarkVariant, setIsDarkVariant] = useState(false);
  const imgCacheRef = useRef<ImgCache | null>(null);

  const recompute = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dim = config.dimAmount ?? 0;

    const applyRaw = (raw: number) => {
      setIsDarkVariant(raw * (1 - dim) > LUMINANCE_THRESHOLD);
    };

    if (config.mode === 'custom' || config.mode === 'unsplash') {
      const url = config.mode === 'custom' ? customImageUrl : unsplash.imageUrl;
      if (!url) { applyRaw(luminance(FALLBACK_HEX)); return; }

      const fit: 'cover' | 'contain' =
        config.mode === 'custom' && (config.scalingMode ?? 'fit') === 'fit' ? 'contain' : 'cover';
      const letterboxHex = config.letterboxColor ?? '#000000';

      ensureImageCache(imgCacheRef, url, fit, cache => {
        const sampled = sampleImage(cache, cx, cy, letterboxHex);
        applyRaw(sampled ?? luminance(letterboxHex));
      });
      return;
    }

    applyRaw(getAnalyticLuminance(config, isDark, cx, cy, backgroundCss));
  }, [buttonRef, config, customImageUrl, unsplash.imageUrl, isDark, backgroundCss]);

  // Mount + background change + position change.
  useLayoutEffect(() => {
    recompute();
  }, [recompute, settingsButtonPosition]);

  // Debounced resize — the only trigger that can fire rapidly, so it's the
  // one that needs guarding against continuous re-sampling.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(recompute, RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (timer) clearTimeout(timer);
    };
  }, [recompute]);

  return isDarkVariant;
}
