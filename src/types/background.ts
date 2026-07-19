// ─── Shared across all modes ───────────────────────────────────────────────
export type BackgroundPosition =
  | 'center' | 'top' | 'bottom' | 'left' | 'right'
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface BackgroundShared {
  luminosity?: number;       // 0–200, default 100 (mid-point = normal brightness)
  // Fields below are shared optionals used by multiple modes; kept here so
  // BackgroundEditor can read them without mode-narrowing until editor panels
  // are split per-provider (future step).
  gradientIntensity?: number;
  customColor?: string;
  scalingMode?: 'cover' | 'fit';
  letterboxColor?: string;
  /** @deprecated kept for backwards-compat with stored configs */
  customGradient?: boolean;
  // Modular display controls — apply to the active background layer
  // regardless of provider (see Background.tsx).
  dateMode?: 'today' | 'custom'; // default 'today'
  customDate?: string;           // YYYY-MM-DD, default current date
  blur?: number;                 // 0–100 (px), default 0
  scaleToFit?: boolean;          // default true — object-fit: contain vs cover
  position?: BackgroundPosition; // default 'center'
  autoDimNight?: boolean;        // default false
  nightStart?: string;           // HH:MM (24h), default '22:00'
  nightEnd?: string;             // HH:MM (24h), default '05:00'
}

// ─── Per-mode discriminated configs ────────────────────────────────────────
export interface PresetConfig extends BackgroundShared {
  mode: 'preset';
  value: string;             // preset id
}

export interface ColorConfig extends BackgroundShared {
  mode: 'color' | 'gradient';
  value: string;             // CSS gradient string or hex
}

export interface CustomImageConfig extends BackgroundShared {
  mode: 'custom';
  value: string;             // unused; kept for storage shape compat
}

export interface UnsplashConfig extends BackgroundShared {
  mode: 'unsplash';
  value: string;             // unused placeholder (keeps storage shape uniform)
  query?: string;            // free-text search term
  topics?: string[];         // Unsplash topic ids
  source?: 'search' | 'topics' | 'random';
  rotationInterval?: number; // seconds between photo changes, default 900
  showAttribution?: boolean; // default true
  apiKey?: string;           // stored in sync; user-supplied
  // attribution data cached alongside the image url
  photographerName?: string;
  photographerUrl?: string;
  unsplashPhotoUrl?: string;
}

export interface BingConfig extends BackgroundShared {
  mode: 'bing';
  value: string; // unused; kept for storage shape uniformity with other modes
  showTitle?: boolean; // default false — overlay Bing's daily wallpaper title
}

// ─── Placeholder Tabliss-parity providers (not yet implemented) ───────────
export interface AstronomyConfig extends BackgroundShared {
  mode: 'astronomy';
  value: string; // unused placeholder; kept for storage shape uniformity
  showApodTitle?: boolean; // default false — overlay NASA's title for the day
}

export interface ColourGradientConfig extends BackgroundShared {
  mode: 'colourGradient';
  value: string; // unused placeholder; kept for storage shape uniformity
}

export interface OnlineImageConfig extends BackgroundShared {
  mode: 'online';
  value: string; // unused placeholder; kept for storage shape uniformity
}

export interface WikimediaConfig extends BackgroundShared {
  mode: 'wikimedia';
  value: string; // unused placeholder; kept for storage shape uniformity
}

export type BackgroundConfig =
  | PresetConfig
  | ColorConfig
  | CustomImageConfig
  | UnsplashConfig
  | BingConfig
  | AstronomyConfig
  | ColourGradientConfig
  | OnlineImageConfig
  | WikimediaConfig;

export type BackgroundMode = BackgroundConfig['mode'];

// ─── Defaults ──────────────────────────────────────────────────────────────
export const DEFAULT_BG: PresetConfig = {
  mode: 'preset',
  value: 'midnight',
  gradientIntensity: 100,
};

// ─── Editor grouping ───────────────────────────────────────────────────────
// Which settings-panel sub-view a provider's controls render under. Several
// modes can share one panel (preset/color/gradient all live under "colors").
export type BackgroundPanel = 'colors' | 'image' | 'unsplash' | 'bing' | 'astronomy' | 'gradient' | 'online' | 'wikimedia';

// ─── Provider registry interface ───────────────────────────────────────────
export interface BackgroundProviderDef<C extends BackgroundConfig = BackgroundConfig> {
  mode: C['mode'];
  label: string;
  /** Editor sub-panel this provider's mode is edited under (drives the Background dropdown). */
  panel: BackgroundPanel;
  /** Resolves the CSS `background` value from config + runtime data */
  resolveCss: (config: C, ctx: BackgroundRenderCtx) => string;
}

export interface BackgroundRenderCtx {
  isDark: boolean;
  customImageUrl: string | null;
  /** Current cached Unsplash image URL (populated by UnsplashProvider) */
  unsplashImageUrl?: string | null;
  /** Current cached Bing Daily Wallpaper image URL */
  bingImageUrl?: string | null;
  /** Current cached NASA Astronomy Picture of the Day image URL */
  apodImageUrl?: string | null;
}

// ─── Preset definitions (unchanged) ────────────────────────────────────────
export interface PresetDef {
  id: string;
  label: string;
  css: string;
  flatColor: string;
  darkStart: string;
  darkEnd: string;
  lightStart: string;
  lightEnd: string;
}

export const PRESETS: PresetDef[] = [
  { id: 'midnight', label: 'Midnight',
    css: 'linear-gradient(135deg, #0f1117 0%, #1a1d2e 100%)', flatColor: '#1a1d2e',
    darkStart: '#0f1117', darkEnd: '#1a1d2e',
    lightStart: '#64748b', lightEnd: '#e2e8f0' },
  { id: 'aurora',   label: 'Aurora',
    css: 'linear-gradient(135deg, #0d1b2a 0%, #1b4332 50%, #081c15 100%)', flatColor: '#1b4332',
    darkStart: '#0d1b2a', darkEnd: '#1b4332',
    lightStart: '#34d399', lightEnd: '#dcfce7' },
  { id: 'dusk',     label: 'Dusk',
    css: 'linear-gradient(135deg, #1a0533 0%, #2d1b69 50%, #11032e 100%)', flatColor: '#2d1b69',
    darkStart: '#1a0533', darkEnd: '#2d1b69',
    lightStart: '#a855f7', lightEnd: '#f3e8ff' },
  { id: 'ocean',    label: 'Ocean',
    css: 'linear-gradient(135deg, #03071e 0%, #023e8a 100%)', flatColor: '#023e8a',
    darkStart: '#03071e', darkEnd: '#023e8a',
    lightStart: '#3b82f6', lightEnd: '#dbeafe' },
  { id: 'ember',    label: 'Ember',
    css: 'linear-gradient(135deg, #1a0a00 0%, #7c2d12 50%, #450a00 100%)', flatColor: '#7c2d12',
    darkStart: '#1a0a00', darkEnd: '#7c2d12',
    lightStart: '#f97316', lightEnd: '#ffedd5' },
];
