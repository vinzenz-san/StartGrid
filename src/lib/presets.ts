// Single source of truth for the 6 named color presets ("Solid Color"
// backgrounds and widget colors both draw from this list) — previously
// duplicated with drifting hex values across types/background.ts's PRESETS
// and SwatchPicker.tsx's THEME_SWATCHES. Each preset now needs only its
// dark-mode `master` color; getAdaptiveColor (colorUtils.ts) derives the
// light-mode counterpart algorithmically. `lightOverride` is an escape
// hatch for a preset whose algorithmic light variant doesn't look right.
export interface ColorPresetDef {
  id: string;
  label: string;
  master: string;
  lightOverride?: string;
}

export const COLOR_PRESETS: ColorPresetDef[] = [
  { id: 'midnight', label: 'Midnight', master: '#1a1d2e' },
  { id: 'aurora',   label: 'Aurora',   master: '#1b4332' },
  { id: 'dusk',     label: 'Dusk',     master: '#2d1b69' },
  { id: 'ocean',    label: 'Ocean',    master: '#023e8a' },
  { id: 'ember',    label: 'Ember',    master: '#7c2d12' },
  { id: 'sun',      label: 'Sun',      master: '#b8860b' },
];
