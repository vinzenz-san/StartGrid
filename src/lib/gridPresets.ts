import type { Widget, WidgetType } from '../types/widget';
import type { TranslationKey } from '../i18n';
import { buildNewWidget } from './gridUtils';

export interface GridPreset {
  id: string;
  labelKey: TranslationKey;
  types: WidgetType[];
}

export const GRID_PRESETS: GridPreset[] = [
  { id: 'minimal', labelKey: 'widgets.presets.minimal', types: ['clock', 'quicklinks'] },
  { id: 'productivity', labelKey: 'widgets.presets.productivity', types: ['clock', 'calendar', 'notes', 'todoList', 'quicklinks'] },
  { id: 'full', labelKey: 'widgets.presets.full', types: ['clock', 'greeting', 'weather', 'calendar', 'quicklinks', 'bookmarks', 'notes', 'todoList', 'rssFeed'] },
];

/**
 * Builds a complete, non-overlapping Widget[] for a preset — replaces
 * whatever's currently on the grid (the caller is responsible for
 * confirming that destructive step with the user before calling
 * replaceAllWidgets with the result).
 */
export function applyPreset(presetId: string, columns: number): Widget[] {
  const preset = GRID_PRESETS.find(p => p.id === presetId);
  if (!preset) return [];

  const placed: Widget[] = [];
  preset.types.forEach((type, i) => {
    // Built up sequentially against `placed` so each new widget avoids every
    // one placed before it, same as buildNewWidget's normal "add one widget"
    // use — just called in a loop here instead of once per user click.
    const widget = buildNewWidget(placed, columns, type);
    placed.push({ ...widget, id: `w-preset-${Date.now()}-${i}` } as Widget);
  });
  return placed;
}
