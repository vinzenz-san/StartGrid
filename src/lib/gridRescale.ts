// Adjusts a widget layout when the grid's column count changes. Deliberately
// simple: widget sizes (w, h) are left exactly as they are — the only
// per-widget change is clamping w down when it literally no longer fits
// within the new column count, and re-clamping col to stay in bounds for
// whatever w ends up being. Anything left overlapping after that clamp gets
// nudged to the nearest free position by the same repacking pass "Compact
// Grid" and the rest of the app already rely on (gridUtils.ts). Pure,
// side-effect-free, and independently testable: no React/storage
// dependency. cellWidth/cellHeight/gap changes never need any per-widget
// adjustment at all, since col/row/w/h are always plain grid units,
// independent of cell pixel size.
import type { Widget } from '../types/widget';
import type { GridConfig } from '../types/grid';
import { isPositionFree, findNearestFreePosition } from './gridUtils';

function configsEqual(a: GridConfig, b: GridConfig): boolean {
  return a.columns === b.columns && a.cellWidth === b.cellWidth
    && a.cellHeight === b.cellHeight && a.gap === b.gap;
}

// Clamp widget width down to fit the new column count where needed, and
// re-clamp col to keep it in bounds. Sizes are otherwise untouched.
function clampToColumns(widgets: Widget[], columns: number): Widget[] {
  return widgets.map(widget => {
    const newW = Math.min(widget.w, columns);
    const newCol = Math.max(1, Math.min(widget.col, columns - newW + 1));
    return { ...widget, col: newCol, w: newW };
  });
}

// Deterministic repacking pass: process widgets in a stable row-major order
// derived from their *original* position (not the clamped one) so re-running
// this is reproducible regardless of the widgets array's storage/iteration
// order, then nudge each into the nearest free spot near its clamped
// position if it now overlaps something already placed.
function repackClamped(originalWidgets: Widget[], clamped: Widget[], columns: number): Widget[] {
  const order = originalWidgets
    .map((w, i) => ({ i, row: w.row, col: w.col }))
    .sort((a, b) => a.row - b.row || a.col - b.col)
    .map(o => o.i);

  const placed: Widget[] = [];
  for (const idx of order) {
    const c = clamped[idx];
    if (isPositionFree(placed, c.id, c.col, c.row, c.w, c.h)) {
      placed.push(c);
    } else {
      const { col, row } = findNearestFreePosition(placed, columns, c.id, c.w, c.h, c.col, c.row);
      placed.push({ ...c, col, row });
    }
  }

  // Restore the input array's original ordering (repacking above is keyed by
  // a different, row-major processing order) so callers see stable identity
  // ordering rather than a shuffled list.
  const byId = new Map(placed.map(w => [w.id, w]));
  return originalWidgets.map(w => byId.get(w.id)!);
}

export function rescaleWidgets(widgets: Widget[], oldConfig: GridConfig, newConfig: GridConfig): Widget[] {
  // Idempotency guarantee: re-applying the same config is a no-op.
  if (configsEqual(oldConfig, newConfig)) return widgets;

  const clamped = clampToColumns(widgets, newConfig.columns);
  return repackClamped(widgets, clamped, newConfig.columns);
}
