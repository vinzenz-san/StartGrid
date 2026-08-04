// Small hand-drawn weather sprites — the same cheap "reuse a few small
// textures via GPU-blitted quads" technique behind HTC Sense's iconic
// weather animations, instead of trying to fake optics with procedural
// gradients. Copied into public/weather/ so they resolve as extension-
// relative paths at runtime, same as public/icons/. Sources:
//  - rain-*/snowflake: "Weather particle sprites" by EMI EMI GAMES / E.
//    Wouters (emiemigames.itch.io/weather-particle-sprites) — free use
//    permitted per the author's own comment on that page.
//  - cloud-*: "Old frogatto clouds" by Jetrel (opengameart.org/content/
//    old-frogatto-clouds), CC0 — chroma-keyed from their original solid
//    background to add real alpha transparency.
//  - frost-*: "Frosted Screen Effect" by ScratchBattles (squaremeapixel.
//    itch.io/frosted-screen-effect) — free for personal/commercial use,
//    no credit required. Downscaled from the original 1920x1080 source.
const SPRITE_PATHS = {
  rainDark:   'weather/rain-dark.png',
  rainLight:  'weather/rain-light.png',
  rainSplash: 'weather/rain-splash.png', // 80x16 strip — 5 frames of 16x16
  snowflake:  'weather/snowflake.png',
  cloud1:     'weather/cloud-1.png',
  cloud2:     'weather/cloud-2.png',
  cloud3:     'weather/cloud-3.png',
  cloud4:     'weather/cloud-4.png',
  cloud5:     'weather/cloud-5.png',
  cloud6:     'weather/cloud-6.png',
  cloud7:     'weather/cloud-7.png',
  frostLight:  'weather/frost-light.png',
  frostMist:   'weather/frost-mist.png',
  frostMedium: 'weather/frost-medium.png',
  frostHeavy:  'weather/frost-heavy.png',
} as const;

export type SpriteKey = keyof typeof SPRITE_PATHS;

export const RAIN_SPRITES:  readonly SpriteKey[] = ['rainDark', 'rainLight'];
export const CLOUD_SPRITES: readonly SpriteKey[] = ['cloud1', 'cloud2', 'cloud3', 'cloud4', 'cloud5', 'cloud6', 'cloud7'];
// Ordered lightest → heaviest, so a coldness value can index straight in.
export const FROST_SPRITES: readonly SpriteKey[] = ['frostLight', 'frostMist', 'frostMedium', 'frostHeavy'];

const cache = new Map<SpriteKey, HTMLImageElement>();

export function getSprite(key: SpriteKey): HTMLImageElement {
  let img = cache.get(key);
  if (!img) {
    img = new Image();
    img.src = SPRITE_PATHS[key];
    cache.set(key, img);
  }
  return img;
}

// Resolves once every requested sprite has either loaded or failed — callers
// don't need to block the animation loop on this, just kick it off before
// seeding particles so the first frame isn't drawing half-loaded images.
export function preloadSprites(keys: readonly SpriteKey[]): Promise<void> {
  return Promise.all(keys.map(key => {
    const img = getSprite(key);
    if (img.complete) return Promise.resolve();
    return new Promise<void>(resolve => {
      img.addEventListener('load', () => resolve(), { once: true });
      img.addEventListener('error', () => resolve(), { once: true });
    });
  })).then(() => undefined);
}
