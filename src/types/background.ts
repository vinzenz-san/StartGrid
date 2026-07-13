export type BackgroundMode = 'color' | 'gradient' | 'preset' | 'custom';

export interface BackgroundConfig {
  mode: BackgroundMode;
  /** hex color for 'color', CSS gradient string for 'gradient', preset id for 'preset', unused for 'custom' */
  value: string;
  dimAmount?: number;       // 0.0-0.9 overlay darkness, default 0
  scalingMode?: 'cover' | 'fit'; // custom image scaling; 'fit' = contain + letterbox color, default 'cover'
  letterboxColor?: string;  // CSS color for bars in 'fit' mode, default '#000000'
}

export const DEFAULT_BG: BackgroundConfig = {
  mode: 'color',
  value: '#0f1117',
};

export const PRESETS: { id: string; label: string; css: string }[] = [
  { id: 'midnight', label: 'Midnight',  css: 'linear-gradient(135deg, #0f1117 0%, #1a1d2e 100%)' },
  { id: 'aurora',   label: 'Aurora',    css: 'linear-gradient(135deg, #0d1b2a 0%, #1b4332 50%, #081c15 100%)' },
  { id: 'dusk',     label: 'Dusk',      css: 'linear-gradient(135deg, #1a0533 0%, #2d1b69 50%, #11032e 100%)' },
  { id: 'ocean',    label: 'Ocean',     css: 'linear-gradient(135deg, #03071e 0%, #023e8a 100%)' },
  { id: 'ember',    label: 'Ember',     css: 'linear-gradient(135deg, #1a0a00 0%, #7c2d12 50%, #450a00 100%)' },
  { id: 'slate',    label: 'Slate',     css: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' },
];
