import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useStorage } from '../hooks/useStorage';
import { darkenHex } from '../lib/colorUtils';
import { THEME_SWATCHES } from '../components/shared/SwatchPicker';

const STORAGE_KEY = 'sg:theme';

interface ThemeConfig {
  globalColor:    string;
  globalOpacity:  number;
  globalDim:      number;
  globalGradient: boolean;
  globalPresetId?: string;
}

const DEFAULTS: ThemeConfig = {
  globalColor:    '#2a2d3d',
  globalOpacity:  1,
  globalDim:      0,
  globalGradient: false,
};

interface ThemeCtx extends ThemeConfig {
  setGlobalColor:    (color: string) => void;
  setGlobalOpacity:  (opacity: number) => void;
  setGlobalDim:      (dim: number) => void;
  setGlobalGradient: (on: boolean) => void;
  setGlobalPresetId: (id: string | undefined) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useStorage<ThemeConfig>(STORAGE_KEY, DEFAULTS);

  const safeTheme = {
    globalColor:    theme.globalColor    ?? DEFAULTS.globalColor,
    globalOpacity:  theme.globalOpacity  ?? DEFAULTS.globalOpacity,
    globalDim:      theme.globalDim      ?? DEFAULTS.globalDim,
    globalGradient: theme.globalGradient ?? DEFAULTS.globalGradient,
    globalPresetId: theme.globalPresetId,
  };

  useEffect(() => {
    const colorEnd = safeTheme.globalGradient
      ? darkenHex(safeTheme.globalColor)
      : safeTheme.globalColor;
    document.documentElement.style.setProperty('--widget-bg-color',     safeTheme.globalColor);
    document.documentElement.style.setProperty('--widget-bg-color-end', colorEnd);
    document.documentElement.style.setProperty('--widget-bg-opacity',   String(safeTheme.globalOpacity));
    document.documentElement.style.setProperty('--widget-dim',          String(safeTheme.globalDim));

    // Named preset: inject exact CSS gradient (gradient on) or flat color (gradient off)
    if (safeTheme.globalPresetId) {
      const swatch = THEME_SWATCHES.find(s => s.id === safeTheme.globalPresetId);
      if (swatch) {
        const presetCss = safeTheme.globalGradient ? swatch.css : swatch.flatColor;
        document.documentElement.style.setProperty('--widget-bg-preset-css', presetCss);
      }
    } else {
      document.documentElement.style.removeProperty('--widget-bg-preset-css');
    }
  }, [safeTheme.globalColor, safeTheme.globalOpacity, safeTheme.globalDim, safeTheme.globalGradient, safeTheme.globalPresetId]);

  const setGlobalColor    = (globalColor: string)              => setTheme(t => ({ ...t, globalColor }));
  const setGlobalOpacity  = (globalOpacity: number)            => setTheme(t => ({ ...t, globalOpacity }));
  const setGlobalDim      = (globalDim: number)                => setTheme(t => ({ ...t, globalDim }));
  const setGlobalGradient = (globalGradient: boolean)          => setTheme(t => ({ ...t, globalGradient }));
  const setGlobalPresetId = (globalPresetId: string | undefined) => setTheme(t => ({ ...t, globalPresetId }));

  return (
    <Ctx.Provider value={{ ...safeTheme, setGlobalColor, setGlobalOpacity, setGlobalDim, setGlobalGradient, setGlobalPresetId }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
