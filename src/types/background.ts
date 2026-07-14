export type BackgroundMode = 'color' | 'gradient' | 'preset' | 'custom';

export interface BackgroundConfig {
  mode: BackgroundMode;
  /** hex color for 'color', CSS gradient string for 'gradient', preset id for 'preset', unused for 'custom' */
  value: string;
  gradientIntensity?: number;  // 0-100; replaces customGradient. Default 100 (full gradient).
  dimAmount?: number;
  scalingMode?: 'cover' | 'fit';
  letterboxColor?: string;
  customColor?: string;
  /** @deprecated use gradientIntensity instead; kept for backwards-compat with stored configs */
  customGradient?: boolean;
}

export const DEFAULT_BG: BackgroundConfig = {
  mode: 'color',
  value: '#0f1117',
  gradientIntensity: 100,
};

export interface PresetDef {
  id: string;
  label: string;
  css: string;       // dark-mode full gradient (kept for backwards compat)
  flatColor: string; // dark-mode flat
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
