// ─── Shared across all modes ───────────────────────────────────────────────
export interface BackgroundShared {
  dimAmount?: number;        // 0–1, global dim overlay
  // Fields below are shared optionals used by multiple modes; kept here so
  // BackgroundEditor can read them without mode-narrowing until editor panels
  // are split per-provider (future step).
  gradientIntensity?: number;
  customColor?: string;
  scalingMode?: 'cover' | 'fit';
  letterboxColor?: string;
  /** @deprecated kept for backwards-compat with stored configs */
  customGradient?: boolean;
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

export type BackgroundConfig =
  | PresetConfig
  | ColorConfig
  | CustomImageConfig
  | UnsplashConfig;

export type BackgroundMode = BackgroundConfig['mode'];

// ─── Defaults ──────────────────────────────────────────────────────────────
export const DEFAULT_BG: PresetConfig = {
  mode: 'preset',
  value: 'midnight',
  gradientIntensity: 100,
};

// ─── Provider registry interface ───────────────────────────────────────────
export interface BackgroundProviderDef<C extends BackgroundConfig = BackgroundConfig> {
  mode: C['mode'];
  label: string;
  /** Resolves the CSS `background` value from config + runtime data */
  resolveCss: (config: C, ctx: BackgroundRenderCtx) => string;
}

export interface BackgroundRenderCtx {
  isDark: boolean;
  customImageUrl: string | null;
  /** Current cached Unsplash image URL (populated by UnsplashProvider) */
  unsplashImageUrl?: string | null;
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
