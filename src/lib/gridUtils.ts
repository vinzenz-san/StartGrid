import type { Widget } from '../types/widget';

function intersects(
  aCol: number, aRow: number, aW: number, aH: number,
  bCol: number, bRow: number, bW: number, bH: number,
): boolean {
  return aCol < bCol + bW && aCol + aW > bCol &&
         aRow < bRow + bH && aRow + aH > bRow;
}

/** Returns true when the rectangle (col, row, w, h) does not overlap any widget except the one with the given id. */
export function isPositionFree(
  widgets: Widget[],
  id: string,
  col: number, row: number, w: number, h: number,
): boolean {
  return !widgets.some(wgt =>
    wgt.id !== id && intersects(col, row, w, h, wgt.col, wgt.row, wgt.w, wgt.h)
  );
}

/** Scans from the top-left for the first free (col, row) fitting a w×h
 *  rectangle within `columns` columns. Used for "add a new widget", where
 *  there's no existing position to stay near. */
export function findFreePosition(widgets: Widget[], columns: number, w: number, h: number): { col: number; row: number } {
  for (let row = 1; row <= 50; row++) {
    for (let col = 1; col <= columns - w + 1; col++) {
      if (!widgets.some(wgt => intersects(col, row, w, h, wgt.col, wgt.row, wgt.w, wgt.h)))
        return { col, row };
    }
  }
  return { col: 1, row: 1 };
}

/** Like findFreePosition, but searches outward from a preferred (col, row)
 *  instead of always starting at the top-left — used by the grid-rescale
 *  transform (gridRescale.ts) so a widget that collides after rounding gets
 *  nudged the minimum necessary distance from its own rescaled position,
 *  rather than being relocated to wherever the first free slot happens to be
 *  from the origin. Expands ring-by-ring (Chebyshev distance) from the
 *  preferred cell, clamping candidate columns to stay within [1, columns-w+1]
 *  and rows to stay >= 1, until a free rectangle is found. */
export function findNearestFreePosition(
  widgets: Widget[],
  columns: number,
  id: string,
  w: number, h: number,
  preferredCol: number, preferredRow: number,
): { col: number; row: number } {
  const maxCol = Math.max(1, columns - w + 1);
  const startCol = Math.min(Math.max(1, preferredCol), maxCol);
  const startRow = Math.max(1, preferredRow);

  if (isPositionFree(widgets, id, startCol, startRow, w, h)) {
    return { col: startCol, row: startRow };
  }

  // Expanding ring search: at each radius, check every cell on the ring's
  // perimeter (not the full filled square) so larger radii don't re-check
  // cells already ruled out at smaller radii.
  const MAX_RADIUS = 200; // generous ceiling — a real layout collides far less than this
  for (let radius = 1; radius <= MAX_RADIUS; radius++) {
    for (let dRow = -radius; dRow <= radius; dRow++) {
      const onRowEdge = Math.abs(dRow) === radius;
      const rowStep = onRowEdge ? 1 : radius * 2; // interior rows only need the two column edges
      for (let dCol = -radius; dCol <= radius; dCol += (onRowEdge ? 1 : rowStep || 1)) {
        if (!onRowEdge && dCol !== -radius && dCol !== radius) continue;
        const col = startCol + dCol;
        const row = startRow + dRow;
        if (col < 1 || col > maxCol || row < 1) continue;
        if (isPositionFree(widgets, id, col, row, w, h)) return { col, row };
      }
    }
  }

  // Exhausted the search radius (pathological/very dense layout) — fall back
  // to the origin-scan so we always return *something* placeable.
  return findFreePosition(widgets, columns, w, h);
}
