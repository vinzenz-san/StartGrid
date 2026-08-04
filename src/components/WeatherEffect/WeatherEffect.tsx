import { useEffect, useRef, useState } from 'react';
import { useWeatherEffect } from '../../contexts/WeatherEffectContext';
import type { WeatherEffectType } from '../../lib/weatherEffectMap';
import { getSprite, preloadSprites, RAIN_SPRITES, type SpriteKey } from '../../lib/weatherSprites';
import './WeatherEffect.css';

// Rain and snow are small pre-drawn sprites (see weatherSprites.ts) blitted
// via drawImage — the same cheap "reuse a few small textures many times"
// technique behind HTC Sense's iconic weather animations, rather than
// trying to fake realism with procedural gradients.
const MAX_RAIN = 90;
const MAX_SNOW = 70;

// The effect runs for a short window after a new tab opens, then fades back
// out on its own rather than animating indefinitely or cutting off abruptly.
const SESSION_DURATION_MS = 10_000;
const FADE_IN_MS  = 900;
const FADE_OUT_MS = 1800;

function rand(min: number, max: number) { return min + Math.random() * (max - min); }

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

interface ParticleState {
  type:     WeatherEffectType;
  rain:     RainDrop[];
  splashes: Splash[];
  snow:     SnowFlake[];
}

export default function WeatherEffect() {
  const { enabled, effectType, devOverride } = useWeatherEffect();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<ParticleState>({ type: 'none', rain: [], splashes: [], snow: [] });
  // Tinted (recolored) sprite cache for snow — lives per mount of the effect
  // since it's cheap to rebuild and depends on the image having loaded.
  const tintedRef = useRef<Partial<Record<SpriteKey, HTMLCanvasElement>>>({});

  // A dev-panel override bypasses the user-facing enable toggle entirely —
  // that's the point of a debug control, to preview an effect without first
  // wiring up a real location + flipping the setting on.
  const devControlled = devOverride !== null;

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
  }, [devOverride]);

  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const active = (enabled || devControlled) && withinSession && !prefersReducedMotion && effectType !== 'none';

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
        rain:     effectType === 'rain' ? makeRain(w, h, Math.round(MAX_RAIN * density)) : [],
        splashes: [],
        snow:     effectType === 'snow' ? makeSnow(w, h, Math.round(MAX_SNOW * density)) : [],
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

    const neededSprites: SpriteKey[] =
      effectType === 'rain' ? [...RAIN_SPRITES, 'rainSplash'] :
      effectType === 'snow' ? ['snowflake'] : [];

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
  }, [active, effectType]);

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
