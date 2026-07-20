import type { CSSProperties } from 'react';
import type { DisplaySettings } from '../types/widget';

// The old discrete Date-size tiers averaged out to roughly 36% of the
// matching Time-size tier (15/42 at the "M" default) — used here as a fixed
// ratio so the date line keeps scaling relative to the single Font Size
// slider instead of needing its own separate control.
const DATE_SIZE_RATIO = 0.36;

export interface ResolvedDisplayStyle {
  /** transform: scale + rotate — apply to the widget's outer wrapper. */
  wrapper:  CSSProperties;
  /** The resolved primary font size (px) — the widget's main/only text. */
  fontSize: number;
  /** Secondary-text font size (px), derived from `fontSize` via DATE_SIZE_RATIO.
   *  Named for its original use (Clock's date line) — any widget with a
   *  secondary text element can reuse it the same way. */
  dateFontSize: number;
}

/** @param defaultFontSize the widget's own "no override" font size (e.g. Clock's old "M" = 42px, Greeting's old "M" = 22px) — resolveDisplayStyle has no opinion of its own, since that default is a per-widget design choice. */
export function resolveDisplayStyle(ds: DisplaySettings | undefined, defaultFontSize = 42): ResolvedDisplayStyle {
  const fontSize = ds?.fontSize ?? defaultFontSize;
  const scale    = ds?.scale    ?? 1;
  const rotation = ds?.rotation ?? 0;

  const wrapper: CSSProperties = (scale !== 1 || rotation !== 0)
    ? { transform: `scale(${scale}) rotate(${rotation}deg)` }
    : {};

  return {
    wrapper,
    fontSize,
    dateFontSize: Math.round(fontSize * DATE_SIZE_RATIO),
  };
}
