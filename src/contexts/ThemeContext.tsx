import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useStorage } from '../hooks/useStorage';
import { darkenHex, mixHex, getAdaptiveColor } from '../lib/colorUtils';
import { COLOR_PRESETS } from '../lib/presets';
import { useSettings } from './SettingsContext';

const STORAGE_KEY = 'sg:theme';

interface ThemeConfig {
  globalColor:             string;
  globalColorScheme?:      'dark' | 'light'; // which theme was active when globalColor was picked — see getAdaptiveColor (colorUtils.ts)
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
  globalColorScheme:       'dark',
  globalOpacity:           1,
  globalDim:               0,
  globalGradientIntensity: 100,
  widgetShadowOpacity:     75,
  globalPresetId:          'midnight',
};

interface ThemeCtx extends ThemeConfig {
  setGlobalColor:             (color: string, scheme?: 'dark' | 'light') => void;
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
  const effectiveIsDark = colorScheme !== 'light';

  const t = theme ?? DEFAULTS;
  // Backwards-compat: if stored data has the old boolean and no numeric intensity, seed from it
  const legacyIntensity = t.globalGradient === false ? 0 : 100;
  const safeTheme = {
    globalColor:             t.globalColor             ?? DEFAULTS.globalColor,
    globalColorScheme:       t.globalColorScheme        ?? DEFAULTS.globalColorScheme,
    globalOpacity:           t.globalOpacity           ?? DEFAULTS.globalOpacity,
    globalDim:               t.globalDim               ?? DEFAULTS.globalDim,
    globalGradientIntensity: t.globalGradientIntensity ?? legacyIntensity,
    widgetShadowOpacity:     t.widgetShadowOpacity     ?? DEFAULTS.widgetShadowOpacity,
    globalPresetId:          t.globalPresetId,
  };

  useEffect(() => {
    const intensity = safeTheme.globalGradientIntensity;
    const tVal = intensity / 100;

    // A named preset resolves through its own adaptive `master` color;
    // otherwise the picked globalColor adapts via its own recorded scheme.
    // Both paths converge on one hex, then blend the same way toward a
    // darker shade as intensity increases — no separate accent-color
    // concept needed anymore.
    const preset = safeTheme.globalPresetId ? COLOR_PRESETS.find(p => p.id === safeTheme.globalPresetId) : undefined;
    const baseColor = preset
      ? (!effectiveIsDark && preset.lightOverride
          ? preset.lightOverride
          : getAdaptiveColor({ color: preset.master, pickedInDark: true }, effectiveIsDark))
      : getAdaptiveColor({ color: safeTheme.globalColor, pickedInDark: safeTheme.globalColorScheme !== 'light' }, effectiveIsDark);

    const colorEnd = mixHex(baseColor, darkenHex(baseColor), tVal);
    document.documentElement.style.setProperty('--widget-bg-color',       baseColor);
    document.documentElement.style.setProperty('--widget-bg-color-end',   colorEnd);
    document.documentElement.style.setProperty('--widget-bg-opacity',     String(safeTheme.globalOpacity));
    document.documentElement.style.setProperty('--widget-dim',            String(safeTheme.globalDim));
    document.documentElement.style.setProperty('--widget-shadow-opacity', String(safeTheme.widgetShadowOpacity));

    if (safeTheme.globalPresetId) {
      document.documentElement.style.setProperty('--widget-bg-preset-css', `linear-gradient(135deg, ${baseColor} 0%, ${colorEnd} 100%)`);
    } else {
      document.documentElement.style.removeProperty('--widget-bg-preset-css');
    }
  }, [safeTheme.globalColor, safeTheme.globalColorScheme, safeTheme.globalOpacity, safeTheme.globalDim, safeTheme.globalGradientIntensity, safeTheme.widgetShadowOpacity, safeTheme.globalPresetId, effectiveIsDark]);

  const setGlobalColor             = (globalColor: string, globalColorScheme?: 'dark' | 'light') =>
    setTheme(t => ({ ...t, globalColor, globalColorScheme: globalColorScheme ?? (effectiveIsDark ? 'dark' : 'light') }));
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
