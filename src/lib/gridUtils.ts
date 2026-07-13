import type { Widget } from '../types/widget';

const COLS = 8;

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

export function findFreePosition(widgets: Widget[], w: number, h: number): { col: number; row: number } {
  for (let row = 1; row <= 50; row++) {
    for (let col = 1; col <= COLS - w + 1; col++) {
      if (!widgets.some(wgt => intersects(col, row, w, h, wgt.col, wgt.row, wgt.w, wgt.h)))
        return { col, row };
    }
  }
  return { col: 1, row: 1 };
}
