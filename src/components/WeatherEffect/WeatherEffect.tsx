import { useEffect, useRef, useState } from 'react';
import { useWeatherEffect } from '../../contexts/WeatherEffectContext';
import type { WeatherEffectType } from '../../lib/weatherEffectMap';
import { getSprite, preloadSprites, RAIN_SPRITES, CLOUD_SPRITES, FROST_SPRITES, type SpriteKey } from '../../lib/weatherSprites';
import './WeatherEffect.css';

// Rain, snow, clouds and frost are all small pre-drawn sprites (see
// weatherSprites.ts) blitted via drawImage — the same cheap "reuse a few
// small textures many times" technique behind HTC Sense's iconic weather
// animations, rather than trying to fake realism with procedural gradients.
const MAX_RAIN   = 90;
const MAX_SNOW   = 70;
const MAX_CLOUDS = 6;

// The effect runs for a short window after a new tab opens, then fades back
// out on its own rather than animating indefinitely or cutting off abruptly.
const SESSION_DURATION_MS = 10_000;
const FADE_IN_MS  = 900;
const FADE_OUT_MS = 1800;

function rand(min: number, max: number) { return min + Math.random() * (max - min); }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

// Recolors a sprite once into an offscreen canvas (source-atop is scoped to
// that canvas alone, so no risk of it bleeding into whatever else is on the
// shared weather canvas) — cached and reused every frame after that, rather
// than re-compositing per instance per frame.
function tintSprite(img: HTMLImageElement, color: string): HTMLCanvasElement | null {
  if (!img.complete || img.naturalWidth === 0) return null;
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const cctx = c.getContext('2d');
  if (!cctx) return null;
  cctx.drawImage(img, 0, 0);
  cctx.globalCompositeOperation = 'source-atop';
  cctx.fillStyle = color;
  cctx.fillRect(0, 0, c.width, c.height);
  return c;
}

// ── Rain: falling streak sprites (2 tint variants) plus an occasional
// splash flourish (5-frame strip) where a drop exits the bottom edge. ────
interface RainDrop { x: number; y: number; speed: number; scale: number; opacity: number; tilt: number; sprite: SpriteKey; }
interface Splash { x: number; y: number; t: number; }
const SPLASH_FRAME_COUNT = 5;
const SPLASH_DURATION    = 22; // in normalized ~60fps steps

function makeRainDrop(w: number, h: number): RainDrop {
  return {
    x: rand(0, w), y: rand(-h, h), speed: rand(5, 11), scale: rand(0.8, 1.6),
    opacity: rand(0.45, 0.9), tilt: rand(-0.12, 0.12),
    sprite: Math.random() < 0.5 ? 'rainDark' : 'rainLight',
  };
}
function makeRain(w: number, h: number, count: number): RainDrop[] {
  return Array.from({ length: count }, () => makeRainDrop(w, h));
}
function updateRainDrop(d: RainDrop, dt: number, w: number, h: number, splashes: Splash[]) {
  d.y += d.speed * dt;
  d.x += d.tilt * d.speed * dt;
  const len = 32 * d.scale;
  if (d.y - len > h) {
    if (splashes.length < 24 && Math.random() < 0.4) splashes.push({ x: d.x, y: h - 2, t: 0 });
    d.x = rand(0, w);
    d.y = rand(-40, -10);
  }
}
function drawRainDrop(ctx: CanvasRenderingContext2D, d: RainDrop) {
  const sprite = getSprite(d.sprite);
  if (!sprite.complete || sprite.naturalWidth === 0) return;
  const w = 16 * d.scale, h = 32 * d.scale;
  ctx.save();
  ctx.globalAlpha = d.opacity;
  ctx.translate(d.x, d.y);
  ctx.rotate(d.tilt);
  ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
  ctx.restore();
}
function drawSplash(ctx: CanvasRenderingContext2D, s: Splash) {
  const sheet = getSprite('rainSplash');
  if (!sheet.complete || sheet.naturalWidth === 0) return;
  const frame = Math.min(SPLASH_FRAME_COUNT - 1, Math.floor(s.t * SPLASH_FRAME_COUNT));
  const size = 24;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - s.t);
  ctx.drawImage(sheet, frame * 16, 0, 16, 16, s.x - size / 2, s.y - size / 2, size, size);
  ctx.restore();
}

// ── Snow: drifting, tumbling snowflake sprite. ───────────────────────────
interface SnowFlake { x: number; y: number; r: number; speed: number; drift: number; phase: number; rot: number; rotSpeed: number; }
function makeSnow(w: number, h: number, count: number): SnowFlake[] {
  return Array.from({ length: count }, () => ({
    x: rand(0, w), y: rand(0, h), r: rand(6, 13), speed: rand(0.5, 1.5), drift: rand(-0.5, 0.5),
    phase: rand(0, Math.PI * 2), rot: rand(0, Math.PI * 2), rotSpeed: rand(-0.02, 0.02),
  }));
}
function drawSnowFlake(ctx: CanvasRenderingContext2D, f: SnowFlake, sprite: HTMLCanvasElement | null) {
  if (!sprite) return;
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.translate(f.x, f.y);
  ctx.rotate(f.rot);
  ctx.drawImage(sprite, -f.r, -f.r, f.r * 2, f.r * 2);
  ctx.restore();
}

// ── Clouds: two overlapping sprite instances per cloud (different variants
// picked at random, offset/scaled) for shape variety from the 7 source
// textures. Drawn at their own painted colors/shading (no tint) — that
// baked-in light/dark texture is what makes them read as fluffy rather
// than flat. ───────────────────────────────────────────────────────────
interface CloudShape {
  x: number; y: number; scale: number; speed: number; opacity: number; bobPhase: number;
  spriteA: SpriteKey; spriteB: SpriteKey; offB: { dx: number; dy: number; scale: number };
}
function makeClouds(w: number, h: number, count: number): CloudShape[] {
  return Array.from({ length: count }, () => ({
    x: rand(-w * 0.2, w), y: rand(0, h * 0.35), scale: rand(1.1, 2.2), speed: rand(6, 16), opacity: rand(0.7, 0.95),
    bobPhase: rand(0, Math.PI * 2),
    spriteA: CLOUD_SPRITES[Math.floor(Math.random() * CLOUD_SPRITES.length)],
    spriteB: CLOUD_SPRITES[Math.floor(Math.random() * CLOUD_SPRITES.length)],
    offB: { dx: rand(-0.5, 0.5), dy: rand(-0.15, 0.15), scale: rand(0.5, 0.8) },
  }));
}
function drawCloud(ctx: CanvasRenderingContext2D, c: CloudShape, baseSize: number) {
  const size = baseSize * c.scale;

  const imgA = getSprite(c.spriteA);
  if (imgA.complete && imgA.naturalWidth > 0) {
    const h = size * (imgA.naturalHeight / imgA.naturalWidth);
    ctx.save();
    ctx.globalAlpha = c.opacity;
    ctx.drawImage(imgA, c.x - size / 2, c.y - h / 2, size, h);
    ctx.restore();
  }
  const imgB = getSprite(c.spriteB);
  if (imgB.complete && imgB.naturalWidth > 0) {
    const sizeB = size * c.offB.scale;
    const hB = sizeB * (imgB.naturalHeight / imgB.naturalWidth);
    ctx.save();
    ctx.globalAlpha = c.opacity * 0.9;
    ctx.drawImage(imgB, c.x + c.offB.dx * size - sizeB / 2, c.y + c.offB.dy * size - hB / 2, sizeB, hB);
    ctx.restore();
  }
}

// ── Corner frost: a single hand-painted frost-vignette sprite stretched
// over the whole viewport (already dense/opaque near the edges and clear
// in the middle — reads as "frost creeping in from the corners" without
// needing separate per-corner geometry). Variant + opacity both scale with
// how far below 0°C it is; a slow opacity breathe keeps it from looking
// static. ─────────────────────────────────────────────────────────────
function frostVariantForTemp(temperatureC: number | null): SpriteKey {
  if (temperatureC === null) return FROST_SPRITES[2];
  const coldness = clamp(-temperatureC, 0, 25);
  const index = Math.min(FROST_SPRITES.length - 1, Math.floor((coldness / 25) * FROST_SPRITES.length));
  return FROST_SPRITES[index];
}
function frostAlphaForTemp(temperatureC: number | null): number {
  if (temperatureC === null) return 0.6;
  const coldness = clamp(-temperatureC, 0, 25);
  return 0.35 + (coldness / 25) * 0.55;
}
function drawFrostOverlay(ctx: CanvasRenderingContext2D, sprite: SpriteKey, w: number, h: number, alpha: number) {
  const img = getSprite(sprite);
  if (!img.complete || img.naturalWidth === 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, 0, 0, w, h);
  ctx.restore();
}

interface ParticleState {
  type:     WeatherEffectType;
  rain:     RainDrop[];
  splashes: Splash[];
  snow:     SnowFlake[];
  clouds:   CloudShape[];
}

export default function WeatherEffect() {
  const { enabled, effectType, devOverride, frostActive, devFrostOverride, temperatureC } = useWeatherEffect();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<ParticleState>({ type: 'none', rain: [], splashes: [], snow: [], clouds: [] });
  // Tinted (recolored) sprite cache for snow — lives per mount of the effect
  // since it's cheap to rebuild and depends on the image having loaded.
  const tintedRef = useRef<Partial<Record<SpriteKey, HTMLCanvasElement>>>({});

  // A dev-panel override bypasses the user-facing enable toggle entirely —
  // that's the point of a debug control, to preview an effect without first
  // wiring up a real location + flipping the setting on.
  const devControlled = devOverride !== null || devFrostOverride !== null;

  const [withinSession, setWithinSession] = useState(true);
  // Fade in on start, fade out before the session ends, rather than a hard
  // cut — `fadeOutMode` just swaps which CSS transition-duration applies.
  const [visible, setVisible] = useState(false);
  const [fadeOutMode, setFadeOutMode] = useState(false);

  // Picking a new override in the dev panel re-arms this whole window, so
  // testers get a fresh 10s (with its own fade in/out) each time.
  useEffect(() => {
    setWithinSession(true);
    setFadeOutMode(false);
    setVisible(false);
    const fadeInFrame = requestAnimationFrame(() => setVisible(true));
    const fadeOutTimer = setTimeout(() => {
      setFadeOutMode(true);
      setVisible(false);
    }, Math.max(0, SESSION_DURATION_MS - FADE_OUT_MS));
    const endTimer = setTimeout(() => setWithinSession(false), SESSION_DURATION_MS);
    return () => {
      cancelAnimationFrame(fadeInFrame);
      clearTimeout(fadeOutTimer);
      clearTimeout(endTimer);
    };
  }, [devOverride, devFrostOverride]);

  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const active = (enabled || devControlled) && withinSession && !prefersReducedMotion
    && (effectType !== 'none' || frostActive);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let cancelled = false;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    function seed(w: number, h: number) {
      // Scale particle counts down on smaller viewports rather than always
      // paying the max-density cost, while still respecting the hard caps.
      const density = Math.min(1, (w * h) / (1280 * 800));
      particlesRef.current = {
        type: effectType,
        rain:     effectType === 'rain'   ? makeRain(w, h, Math.round(MAX_RAIN * density))    : [],
        splashes: [],
        snow:     effectType === 'snow'   ? makeSnow(w, h, Math.round(MAX_SNOW * density))     : [],
        clouds:   effectType === 'clouds' ? makeClouds(w, h, Math.round(MAX_CLOUDS * density)) : [],
      };
    }

    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed(w, h);
    }

    let lastTime = performance.now();
    function frame(now: number) {
      // Normalized to ~60fps steps; capped so a throttled/backgrounded tab
      // resuming doesn't dump one giant catch-up jump on the first frame.
      const dt = Math.min((now - lastTime) / 16.6667, 3);
      lastTime = now;
      const w = window.innerWidth, h = window.innerHeight;
      ctx!.clearRect(0, 0, w, h);
      const p = particlesRef.current;

      if (p.type === 'rain') {
        for (const d of p.rain) {
          updateRainDrop(d, dt, w, h, p.splashes);
          drawRainDrop(ctx!, d);
        }
        for (let i = p.splashes.length - 1; i >= 0; i--) {
          const s = p.splashes[i];
          s.t += dt / SPLASH_DURATION;
          if (s.t >= 1) { p.splashes.splice(i, 1); continue; }
          drawSplash(ctx!, s);
        }
      } else if (p.type === 'snow') {
        const sprite = tintedRef.current.snowflake ?? null;
        for (const f of p.snow) {
          drawSnowFlake(ctx!, f, sprite);
          f.phase += 0.02 * dt;
          f.rot += f.rotSpeed * dt;
          f.x += Math.sin(f.phase) * 0.5 + f.drift * dt;
          f.y += f.speed * dt;
          if (f.y > h) { f.y = -f.r; f.x = rand(0, w); }
          if (f.x > w) f.x = 0; else if (f.x < 0) f.x = w;
        }
      } else if (p.type === 'clouds') {
        for (const c of p.clouds) {
          drawCloud(ctx!, c, 110);
          c.bobPhase += 0.01 * dt;
          c.x += c.speed * 0.05 * dt;
          c.y += Math.sin(c.bobPhase) * 0.05 * dt;
          if (c.x - 160 * c.scale > w) c.x = -160 * c.scale;
        }
      }

      if (frostActive) {
        const breathe = 0.85 + Math.sin(now / 2200) * 0.15;
        drawFrostOverlay(ctx!, frostVariantForTemp(temperatureC), w, h, frostAlphaForTemp(temperatureC) * breathe);
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    function handleVisibility() {
      if (document.hidden) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      } else if (!rafRef.current) {
        lastTime = performance.now();
        rafRef.current = requestAnimationFrame(frame);
      }
    }

    const neededSprites: SpriteKey[] = [
      ...(effectType === 'rain'   ? [...RAIN_SPRITES, 'rainSplash' as SpriteKey] : []),
      ...(effectType === 'snow'   ? ['snowflake' as SpriteKey] : []),
      ...(effectType === 'clouds' ? [...CLOUD_SPRITES] : []),
      ...(frostActive ? [frostVariantForTemp(temperatureC)] : []),
    ];

    preloadSprites(neededSprites).then(() => {
      if (cancelled) return;
      if (effectType === 'snow') {
        tintedRef.current.snowflake = tintSprite(getSprite('snowflake'), 'rgba(255, 255, 255, 1)') ?? undefined;
      }
      resize();
      window.addEventListener('resize', resize);
      if (!document.hidden) rafRef.current = requestAnimationFrame(frame);
      document.addEventListener('visibilitychange', handleVisibility);
    });

    return () => {
      cancelled = true;
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [active, effectType, frostActive, temperatureC]);

  if (!active) return null;
  return (
    <div
      className="sg-weather-effect"
      style={{ opacity: visible ? 1 : 0, transitionDuration: `${fadeOutMode ? FADE_OUT_MS : FADE_IN_MS}ms` }}
    >
      <canvas ref={canvasRef} className="sg-weather-effect-canvas" />
    </div>
  );
}
