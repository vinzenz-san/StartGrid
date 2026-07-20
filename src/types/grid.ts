// Central grid geometry config — replaces the hardcoded column count and
// cell/gap pixel sizes that used to be duplicated across Grid.tsx,
// Grid.css, and gridUtils.ts. cellWidth/cellHeight are independent so the
// grid supports non-square cells (horizontal vs. vertical resolution).
export interface GridConfig {
  columns: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
}

// Matches the previous hardcoded values exactly, so existing installs get a
// config that reproduces current on-screen layout bit-for-bit on first load.
export const DEFAULT_GRID_CONFIG: GridConfig = {
  columns: 8,
  cellWidth: 120,
  cellHeight: 120,
  gap: 12,
};
