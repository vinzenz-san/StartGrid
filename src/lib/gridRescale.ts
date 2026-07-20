// Rescales a widget layout from one GridConfig to another, preserving each
// widget's physical on-screen pixel footprint (size + position) as closely
// as integer grid units allow — see the "Grid Resolution" architecture
// discussion this implements. Pure, side-effect-free, and independently
// testable: no React/storage dependency.
import type { Widget } from '../types/widget';
import type { GridConfig } from '../types/grid';
import { WIDGET_REGISTRY } from '../components/widgets/registry';
import { isPositionFree, findNearestFreePosition } from './gridUtils';

// Floor for widget types that don't declare their own registry minSize
// (currently just the dev-only placeholder) — keeps the clamp step total.
const FALLBACK_MIN_PX = { w: 100, h: 80 };

function unitsToPixelSize(units: number, cell: number, gap: number): number {
  return units * cell + (units - 1) * gap;
}

function pixelSizeToUnits(px: number, cell: number, gap: number): number {
  return (px + gap) / (cell + gap);
}

// Cell index (0-based) -> pixel offset of that cell's leading edge, and the
// inverse. Distinct from the size formulas above: a size of `w` cells spans
// w-1 *internal* gaps, while an offset of `n` cells-from-origin has passed n
// full (cell+gap) strides — same denominator, different numerator shape.
function indexToPixelOffset(index0: number, cell: number, gap: number): number {
  return index0 * (cell + gap);
}

function pixelOffsetToIndex(px: number, cell: number, gap: number): number {
  return px / (cell + gap);
}

function configsEqual(a: GridConfig, b: GridConfig): boolean {
  return a.columns === b.columns && a.cellWidth === b.cellWidth
    && a.cellHeight === b.cellHeight && a.gap === b.gap;
}

export function rescaleWidgets(widgets: Widget[], oldConfig: GridConfig, newConfig: GridConfig): Widget[] {
  // Idempotency guarantee: re-applying the same config is a no-op.
  if (configsEqual(oldConfig, newConfig)) return widgets;

  // ── Steps A–C: per-widget footprint capture, unit conversion, rounding +
  // min-size clamp. Fully independent per widget — no cross-widget state. ──
  const provisional = widgets.map(widget => {
    const pxW = unitsToPixelSize(widget.w, oldConfig.cellWidth, oldConfig.gap);
    const pxH = unitsToPixelSize(widget.h, oldConfig.cellHeight, oldConfig.gap);
    const pxColOffset = indexToPixelOffset(widget.col - 1, oldConfig.cellWidth, oldConfig.gap);
    const pxRowOffset = indexToPixelOffset(widget.row - 1, oldConfig.cellHeight, oldConfig.gap);

    const rawW = pixelSizeToUnits(pxW, newConfig.cellWidth, newConfig.gap);
    const rawH = pixelSizeToUnits(pxH, newConfig.cellHeight, newConfig.gap);
    const rawCol0 = pixelOffsetToIndex(pxColOffset, newConfig.cellWidth, newConfig.gap);
    const rawRow0 = pixelOffsetToIndex(pxRowOffset, newConfig.cellHeight, newConfig.gap);

    const entry = WIDGET_REGISTRY[widget.type];
    const minPx = entry?.minSize ?? FALLBACK_MIN_PX;
    // Round the floor itself up (never down) — a widget must never end up
    // smaller than its declared minimum after clamping.
    const minUnitsW = Math.max(1, Math.ceil(pixelSizeToUnits(minPx.w, newConfig.cellWidth, newConfig.gap)));
    const minUnitsH = Math.max(1, Math.ceil(pixelSizeToUnits(minPx.h, newConfig.cellHeight, newConfig.gap)));

    let newW = Math.max(1, Math.round(rawW));
    let newH = Math.max(1, Math.round(rawH));
    if (newW < minUnitsW) newW = minUnitsW;
    if (newH < minUnitsH) newH = minUnitsH;
    newW = Math.min(newW, newConfig.columns);

    let newCol = Math.round(rawCol0) + 1;
    const newRow = Math.max(1, Math.round(rawRow0) + 1);
    newCol = Math.max(1, Math.min(newCol, newConfig.columns - newW + 1));

    return { ...widget, col: newCol, row: newRow, w: newW, h: newH };
  });

  // ── Step D: deterministic repacking pass ──
  // Process in a stable order derived from each widget's *original* position
  // (row-major) so re-running the migration is reproducible regardless of
  // the widgets array's storage/iteration order — independent of the
  // provisional (rescaled) positions, which is what's actually being placed.
  const order = widgets
    .map((w, i) => ({ i, row: w.row, col: w.col }))
    .sort((a, b) => a.row - b.row || a.col - b.col)
    .map(o => o.i);

  const placed: Widget[] = [];
  for (const idx of order) {
    const prov = provisional[idx];
    if (isPositionFree(placed, prov.id, prov.col, prov.row, prov.w, prov.h)) {
      placed.push(prov);
    } else {
      const { col, row } = findNearestFreePosition(
        placed, newConfig.columns, prov.id, prov.w, prov.h, prov.col, prov.row,
      );
      placed.push({ ...prov, col, row });
    }
  }

  // Restore the input array's original ordering (repacking above is keyed by
  // a different, row-major processing order) so callers see stable identity
  // ordering rather than a shuffled list.
  const byId = new Map(placed.map(w => [w.id, w]));
  return widgets.map(w => byId.get(w.id)!);
}
