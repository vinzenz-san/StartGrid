import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useStorage } from '../hooks/useStorage';
import { darkenHex, mixHex } from '../lib/colorUtils';
import { THEME_SWATCHES } from '../components/shared/SwatchPicker';
import { useSettings } from './SettingsContext';

const STORAGE_KEY = 'sg:theme';

interface ThemeConfig {
  globalColor:             string;
  globalOpacity:           number;
  globalDim:               number;
  globalGradientIntensity: number;   // 0-100; replaces globalGradient boolean
  widgetShadowOpacity:     number;   // 0-100
  /** @deprecated kept for backwards-compat with stored data */
  globalGradient?:         boolean;
  globalPresetId?:         string;
}

export const DEFAULTS: ThemeConfig = {
  globalColor:             '#2a2d3d',
  globalOpacity:           1,
  globalDim:               0,
  globalGradientIntensity: 100,
  widgetShadowOpacity:     75,
  globalPresetId:          'midnight',
};

interface ThemeCtx extends ThemeConfig {
  setGlobalColor:             (color: string) => void;
  setGlobalOpacity:           (opacity: number) => void;
  setGlobalDim:               (dim: number) => void;
  setGlobalGradientIntensity: (intensity: number) => void;
  setWidgetShadowOpacity:     (opacity: number) => void;
  setGlobalPresetId:          (id: string | undefined) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useStorage<ThemeConfig>(STORAGE_KEY, DEFAULTS);
  const { colorScheme } = useSettings();

  const t = theme ?? DEFAULTS;
  // Backwards-compat: if stored data has the old boolean and no numeric intensity, seed from it
  const legacyIntensity = t.globalGradient === false ? 0 : 100;
  const safeTheme = {
    globalColor:             t.globalColor             ?? DEFAULTS.globalColor,
    globalOpacity:           t.globalOpacity           ?? DEFAULTS.globalOpacity,
    globalDim:               t.globalDim               ?? DEFAULTS.globalDim,
    globalGradientIntensity: t.globalGradientIntensity ?? legacyIntensity,
    widgetShadowOpacity:     t.widgetShadowOpacity     ?? DEFAULTS.widgetShadowOpacity,
    globalPresetId:          t.globalPresetId,
  };

  useEffect(() => {
    const intensity = safeTheme.globalGradientIntensity;
    const tVal = intensity / 100;
    const colorEnd = mixHex(safeTheme.globalColor, darkenHex(safeTheme.globalColor), tVal);
    document.documentElement.style.setProperty('--widget-bg-color',       safeTheme.globalColor);
    document.documentElement.style.setProperty('--widget-bg-color-end',   colorEnd);
    document.documentElement.style.setProperty('--widget-bg-opacity',     String(safeTheme.globalOpacity));
    document.documentElement.style.setProperty('--widget-dim',            String(safeTheme.globalDim));
    document.documentElement.style.setProperty('--widget-shadow-opacity', String(safeTheme.widgetShadowOpacity));

    // Named global preset: compute intensity-blended gradient and inject as CSS var
    if (safeTheme.globalPresetId) {
      const swatch = THEME_SWATCHES.find(s => s.id === safeTheme.globalPresetId);
      if (swatch) {
        const isDark = colorScheme !== 'light';
        const endColor   = isDark ? swatch.darkEnd   : swatch.lightEnd;
        const startColor = isDark ? swatch.darkStart : swatch.lightStart;
        const blendedStart = mixHex(endColor, startColor, tVal);
        const presetCss = `linear-gradient(135deg, ${blendedStart} 0%, ${endColor} 100%)`;
        document.documentElement.style.setProperty('--widget-bg-preset-css', presetCss);
      }
    } else {
      document.documentElement.style.removeProperty('--widget-bg-preset-css');
    }
  }, [safeTheme.globalColor, safeTheme.globalOpacity, safeTheme.globalDim, safeTheme.globalGradientIntensity, safeTheme.widgetShadowOpacity, safeTheme.globalPresetId, colorScheme]);

  const setGlobalColor             = (globalColor: string)    => setTheme(t => ({ ...t, globalColor }));
  const setGlobalOpacity           = (globalOpacity: number)  => setTheme(t => ({ ...t, globalOpacity }));
  const setGlobalDim               = (globalDim: number)      => setTheme(t => ({ ...t, globalDim }));
  const setGlobalGradientIntensity = (globalGradientIntensity: number) => setTheme(t => ({ ...t, globalGradientIntensity }));
  const setWidgetShadowOpacity     = (widgetShadowOpacity: number)     => setTheme(t => ({ ...t, widgetShadowOpacity }));
  const setGlobalPresetId          = (globalPresetId: string | undefined) => setTheme(t => ({ ...t, globalPresetId }));

  return (
    <Ctx.Provider value={{ ...safeTheme, setGlobalColor, setGlobalOpacity, setGlobalDim, setGlobalGradientIntensity, setWidgetShadowOpacity, setGlobalPresetId }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
