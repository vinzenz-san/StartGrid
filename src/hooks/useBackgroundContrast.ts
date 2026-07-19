import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useBackground } from '../contexts/BackgroundContext';
import { useSettings } from '../contexts/SettingsContext';
import { PRESETS, type BackgroundConfig, type BackgroundPosition } from '../types/background';
import { luminance, mixHex, darkenHex } from '../lib/colorUtils';

const DEBUG_CONTRAST = false; // flip off once the APOD white-icon issue is confirmed fixed

// Same 9-way mapping Background.tsx uses for `background-position`, expressed
// as per-axis alignment instead of CSS keywords — 'start'/'end' matching the
// low/high edge of the axis, so the sampling offset math below can mirror
// exactly where the real background-position placed the image on screen.
const POSITION_ALIGN: Record<BackgroundPosition, { x: 'start' | 'center' | 'end'; y: 'start' | 'center' | 'end' }> = {
  center:         { x: 'center', y: 'center' },
  top:            { x: 'center', y: 'start'  },
  bottom:         { x: 'center', y: 'end'    },
  left:           { x: 'start',  y: 'center' },
  right:          { x: 'end',    y: 'center' },
  'top-left':     { x: 'start',  y: 'start'  },
  'top-right':    { x: 'end',    y: 'start'  },
  'bottom-left':  { x: 'start',  y: 'end'    },
  'bottom-right': { x: 'end',    y: 'end'    },
};

function resolveAxisOffset(viewportSize: number, drawnSize: number, align: 'start' | 'center' | 'end'): number {
  if (align === 'start') return 0;
  if (align === 'end') return viewportSize - drawnSize;
  return (viewportSize - drawnSize) / 2;
}

const LUMINANCE_THRESHOLD = 160;
const RESIZE_DEBOUNCE_MS  = 180;
const FALLBACK_HEX        = '#0f1117'; // matches each provider's own no-image/no-preset fallback

// ── Background-script relay ──────────────────────────────────────────────
// Raw global lookup rather than importing webextension-polyfill — this file
// isn't part of the background entry's module graph so the dynamic-import
// chunk-loading concern doesn't apply here, but there's no need to pull the
// polyfill in for a single sendMessage call either. Both Firefox's native
// `browser.runtime.sendMessage` and Chrome MV3's `chrome.runtime.sendMessage`
// (Promise-based when called with no callback) resolve the same way.

interface FetchExternalImageResponse {
  ok: boolean;
  dataUrl?: string;
  error?: string;
}

function sendRuntimeMessage(message: { action: string; url: string }): Promise<FetchExternalImageResponse | undefined> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalApi = globalThis as any;
  const runtime = globalApi.browser?.runtime ?? globalApi.chrome?.runtime;
  if (!runtime?.sendMessage) return Promise.resolve(undefined);
  return runtime.sendMessage(message);
}

// ── Offscreen image cache ────────────────────────────────────────────────
// One entry, keyed by url+fit+viewport. The expensive step (decode + draw)
// only re-runs when that key changes; every trigger in between just reads
// already-rendered pixels off the cached canvas.

interface ImgCache {
  url: string;
  fit: 'cover' | 'contain';
  position: BackgroundPosition;
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
  position: BackgroundPosition,
  isExternal: boolean,
  cb: (cache: ImgCache) => void,
) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const existing = cacheRef.current;

  if (existing && existing.url === url && existing.fit === fit && existing.position === position
    && existing.viewportW === vw && existing.viewportH === vh) {
    if (existing.ready || existing.failed) { cb(existing); return; }
    existing.waiters.push(cb);
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width  = vw;
  canvas.height = vh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;

  const cache: ImgCache = {
    url, fit, position, viewportW: vw, viewportH: vh, ready: false, failed: false,
    naturalW: 0, naturalH: 0, scale: 1, offsetX: 0, offsetY: 0, canvas, ctx, waiters: [cb],
  };
  (cacheRef as { current: ImgCache | null }).current = cache;

  const img = new Image();
  // crossOrigin is only meaningful (and only accepted by the browser) on a
  // real http(s) request — setting it before assigning a data: URL src is
  // what was actually causing the `naturalW: 0, failed: true` load failures,
  // since browsers reject a CORS-mode image element loading a data: URL.
  // External images are now always resolved to a data: URL via the
  // background-script relay below, and local/custom images are already
  // data:/blob: URIs, so this only ever applies to a genuine http(s) src.
  const isRemoteHttpUrl = url.startsWith('http://') || url.startsWith('https://');
  if (isRemoteHttpUrl && !isExternal) {
    img.crossOrigin = 'anonymous';
  }

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
        const align = POSITION_ALIGN[position] ?? POSITION_ALIGN.center;
        cache.scale   = scale;
        // Previously always (vw - drawnW) / 2 / (vh - drawnH) / 2 — silently
        // assumed centered placement regardless of the actual configured
        // `position`. Background.tsx applies `background-position` from that
        // same config, so a non-center position meant this canvas rendered
        // the image somewhere different than what's actually on screen —
        // sampling could land in a letterbox/crop zone that isn't really
        // there (or vice versa), depending on where the button happened to sit.
        cache.offsetX = resolveAxisOffset(vw, drawnW, align.x);
        cache.offsetY = resolveAxisOffset(vh, drawnH, align.y);
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
    if (DEBUG_CONTRAST) {
      console.log('[bg-contrast] image load finished', {
        // `sourceUrl` is the original request URL used as the cache key —
        // NOT necessarily what img.src actually loaded (for external images
        // that's always a data: URL by this point). Check img.src directly
        // if you need to confirm what was actually assigned to the element.
        sourceUrl: cache.url, imgSrc: img.src.slice(0, 60), fit: cache.fit, position: cache.position,
        naturalW: cache.naturalW, naturalH: cache.naturalH,
        scale: cache.scale, offsetX: cache.offsetX, offsetY: cache.offsetY,
        failed: cache.failed,
      });
    }
    cache.ready = true;
    const waiters = cache.waiters;
    cache.waiters = [];
    waiters.forEach(w => w(cache));
  };

  const startLoad = () => {
    if (typeof img.decode === 'function') {
      img.decode().then(() => finish(false)).catch(() => finish(true));
    } else {
      img.onload  = () => finish(false);
      img.onerror = () => finish(true);
    }
  };

  if (isExternal) {
    // A page-context fetch() of these external images still gets CORS-blocked
    // by the host's own response headers even with host_permissions declared
    // and crossOrigin="anonymous" set (confirmed via console: apod.nasa.gov
    // refuses it) — host_permissions only reliably bypasses CORS for a
    // fetch/XHR made from the extension's *background* context, not its page
    // context. So the actual fetch is relayed there via runtime messaging;
    // the background script fetches the bytes and returns them as a base64
    // data: URL, which needs no blob/object-URL cleanup and is never tainted.
    sendRuntimeMessage({ action: 'FETCH_EXTERNAL_IMAGE', url })
      .then(response => {
        if (DEBUG_CONTRAST) {
          console.log('[bg-contrast] Received payload from background:', response?.dataUrl ? 'YES (Base64)' : 'NO/EMPTY', response);
        }
        if (cacheRef.current !== cache) return; // superseded while the message was in flight
        if (!response?.ok || !response.dataUrl) throw new Error(response?.error || 'Fetch failed');
        img.src = response.dataUrl;
        startLoad();
      })
      .catch(err => {
        if (DEBUG_CONTRAST) console.log('[bg-contrast] background relay failed', err);
        finish(true);
      });
  } else {
    // Local/custom images are already data: or blob: URIs — no network
    // round-trip needed, load directly.
    img.src = url;
    startLoad();
  }
}

function sampleImage(cache: ImgCache, px: number, py: number, letterboxHex: string): number | null {
  if (cache.failed || !cache.naturalW) {
    if (DEBUG_CONTRAST) console.log('[bg-contrast] sampleImage: no usable cache', { failed: cache.failed, naturalW: cache.naturalW });
    return null;
  }

  if (cache.fit === 'contain') {
    const drawnW = cache.naturalW * cache.scale;
    const drawnH = cache.naturalH * cache.scale;
    if (px < cache.offsetX || px > cache.offsetX + drawnW || py < cache.offsetY || py > cache.offsetY + drawnH) {
      const letterboxLuminance = luminance(letterboxHex);
      if (DEBUG_CONTRAST) {
        console.log('[bg-contrast] sampleImage: point falls in letterbox bars', {
          px, py, offsetX: cache.offsetX, offsetY: cache.offsetY, drawnW, drawnH, letterboxLuminance,
        });
      }
      return letterboxLuminance; // point falls in the letterbox bars, not the image
    }
  }

  try {
    const x = Math.max(0, Math.min(cache.canvas.width  - 1, Math.round(px)));
    const y = Math.max(0, Math.min(cache.canvas.height - 1, Math.round(py)));
    const [r, g, b] = cache.ctx.getImageData(x, y, 1, 1).data;
    const sampledLuminance = 0.299 * r + 0.587 * g + 0.114 * b;
    if (DEBUG_CONTRAST) console.log('[bg-contrast] sampleImage: sampled pixel', { x, y, r, g, b, sampledLuminance });
    return sampledLuminance;
  } catch (err) {
    if (DEBUG_CONTRAST) console.log('[bg-contrast] sampleImage: getImageData threw (tainted canvas?)', err);
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
  const { config, customImageUrl, backgroundCss, unsplash, bing, astronomy } = useBackground();
  const { colorScheme, settingsButtonPosition } = useSettings();
  const isDark = colorScheme !== 'light';

  const [isDarkVariant, setIsDarkVariant] = useState(false);
  const imgCacheRef = useRef<ImgCache | null>(null);

  const recompute = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const luminosityMul = (config.luminosity ?? 100) / 100;

    const applyRaw = (raw: number) => {
      const adjusted = raw * luminosityMul;
      const needsDarkIcon = adjusted > LUMINANCE_THRESHOLD;
      if (DEBUG_CONTRAST) {
        console.log('[bg-contrast] contrast decision', {
          mode: config.mode,
          rawLuminance: raw,
          luminosityMul,
          adjustedLuminance: adjusted,
          threshold: LUMINANCE_THRESHOLD,
          decision: needsDarkIcon ? 'dark-icon (bright bg)' : 'light-icon (dark bg)',
          settingState: 'isDarkVariant',
        });
      }
      setIsDarkVariant(needsDarkIcon);
    };

    // Every URL-backed provider (custom upload, Unsplash, Bing, APOD) needs the
    // same canvas-sampling path — only preset/color/gradient can be resolved
    // analytically from hex stops. Astronomy/Bing were previously missing
    // here, so they fell through to getAnalyticLuminance() below, which finds
    // no hex colors in a `url(...)` background string and silently defaults
    // to FALLBACK_HEX (near-black) — permanently reading as "dark background"
    // regardless of how bright the actual photo is, leaving the white icon
    // variant stuck on even over a bright image.
    if (config.mode === 'custom' || config.mode === 'unsplash' || config.mode === 'astronomy' || config.mode === 'bing') {
      const url =
        config.mode === 'custom'    ? customImageUrl :
        config.mode === 'unsplash'  ? unsplash.imageUrl :
        config.mode === 'astronomy' ? astronomy.imageUrl :
        bing.imageUrl;
      if (!url) { applyRaw(luminance(FALLBACK_HEX)); return; }

      // 'custom' has its own dedicated scalingMode/letterboxColor fields;
      // every other image mode uses the shared scaleToFit control instead
      // (see Background.tsx's layerStyle) and has no letterbox of its own.
      const fit: 'cover' | 'contain' = config.mode === 'custom'
        ? ((config.scalingMode ?? 'fit') === 'fit' ? 'contain' : 'cover')
        : ((config.scaleToFit ?? true) ? 'contain' : 'cover');
      const letterboxHex = config.mode === 'custom' ? (config.letterboxColor ?? '#000000') : '#000000';
      // 'custom' has no position control of its own (always centered);
      // every other image mode uses the shared `position` control, which the
      // sampling offset math must mirror or it can sample the wrong spot.
      const position: BackgroundPosition = config.mode === 'custom' ? 'center' : (config.position ?? 'center');

      // 'custom' images are already local data:/blob: URIs; every other mode
      // here is a real cross-origin URL that needs the background-script relay.
      const isExternal = config.mode !== 'custom';

      ensureImageCache(imgCacheRef, url, fit, position, isExternal, cache => {
        const sampled = sampleImage(cache, cx, cy, letterboxHex);
        applyRaw(sampled ?? luminance(letterboxHex));
      });
      return;
    }

    applyRaw(getAnalyticLuminance(config, isDark, cx, cy, backgroundCss));
  }, [buttonRef, config, customImageUrl, unsplash.imageUrl, bing.imageUrl, astronomy.imageUrl, isDark, backgroundCss]);

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
