import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useStorage } from '../hooks/useStorage';
import { GridConfig, DEFAULT_GRID_CONFIG } from '../types/grid';

interface GridConfigContextType {
  gridConfig: GridConfig;
  setGridConfig: (next: GridConfig) => void;
  loaded: boolean;
}

const Ctx = createContext<GridConfigContextType | null>(null);

export function GridConfigProvider({ children }: { children: ReactNode }) {
  const [gridConfig, setGridConfigRaw, loaded] = useStorage<GridConfig>('gridConfig', DEFAULT_GRID_CONFIG);

  // Injected as runtime CSS custom properties (same pattern as ThemeContext's
  // --widget-bg-color etc.) so Grid.css can consume user-configured grid
  // geometry without a build-time step. index.css keeps static fallback
  // values for the pre-hydration flash, same spirit as its dark-background
  // anti-flash trick.
  useEffect(() => {
    document.documentElement.style.setProperty('--grid-cols', String(gridConfig.columns));
    document.documentElement.style.setProperty('--cell-w', `${gridConfig.cellWidth}px`);
    document.documentElement.style.setProperty('--cell-h', `${gridConfig.cellHeight}px`);
    document.documentElement.style.setProperty('--gap', `${gridConfig.gap}px`);
  }, [gridConfig.columns, gridConfig.cellWidth, gridConfig.cellHeight, gridConfig.gap]);

  // Plain passthrough setter — the rescale orchestration (capturing the old
  // config, running rescaleWidgets, committing both config + widgets) lives
  // at the call site (Settings UI), which already has both this context and
  // WidgetContext in scope. Keeping this context free of a WidgetContext
  // dependency keeps it independently testable and avoids a provider-order
  // dependency between the two.
  const setGridConfig = (next: GridConfig) => setGridConfigRaw(next);

  return (
    <Ctx.Provider value={{ gridConfig, setGridConfig, loaded }}>
      {children}
    </Ctx.Provider>
  );
}

export function useGridConfig() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGridConfig must be used within GridConfigProvider');
  return ctx;
}
