import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useStorage } from '../hooks/useStorage';
import { lightenHex } from '../lib/colorUtils';

const STORAGE_KEY = 'sg:settings';

export type Language        = 'en' | 'de';
export type ColorScheme     = 'light' | 'dark' | 'system';
export type DevPanelPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

export interface AppSettings {
  language:                Language;
  colorScheme:             ColorScheme;
  accentColor:             string;
  developerOptionsEnabled: boolean;
  devPanelPosition:        DevPanelPosition;
  ignoreGlobalThemeSwap:   boolean;
  ignoreLocalThemeSwap:    boolean;
}

export const SETTINGS_DEFAULTS = {
  language:                'en',
  colorScheme:             'system',
  accentColor:             '#6366f1',
  developerOptionsEnabled: false,
  devPanelPosition:        'bottom-left',
  ignoreGlobalThemeSwap:   false,
  ignoreLocalThemeSwap:    false,
} as const satisfies AppSettings;

// GearPosition is retained as an alias so old backup envelopes with this key
// are silently ignored on restore rather than causing a type error.
export type GearPosition = 'bottom-right' | 'bottom-left' | 'top-right';

interface SettingsCtx extends AppSettings {
  updateSettings: (patch: Partial<AppSettings>) => void;
}

const Ctx = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useStorage<AppSettings>(STORAGE_KEY, SETTINGS_DEFAULTS);

  // Defensive: guard against undefined/null/partial from storage on first load or reset
  const s: AppSettings = {
    language:                (settings ?? SETTINGS_DEFAULTS).language                ?? SETTINGS_DEFAULTS.language,
    colorScheme:             (settings ?? SETTINGS_DEFAULTS).colorScheme             ?? SETTINGS_DEFAULTS.colorScheme,
    accentColor:             (settings ?? SETTINGS_DEFAULTS).accentColor             ?? SETTINGS_DEFAULTS.accentColor,
    developerOptionsEnabled: (settings ?? SETTINGS_DEFAULTS).developerOptionsEnabled ?? SETTINGS_DEFAULTS.developerOptionsEnabled,
    devPanelPosition:        (settings ?? SETTINGS_DEFAULTS).devPanelPosition        ?? SETTINGS_DEFAULTS.devPanelPosition,
    ignoreGlobalThemeSwap:   (settings ?? SETTINGS_DEFAULTS).ignoreGlobalThemeSwap   ?? SETTINGS_DEFAULTS.ignoreGlobalThemeSwap,
    ignoreLocalThemeSwap:    (settings ?? SETTINGS_DEFAULTS).ignoreLocalThemeSwap    ?? SETTINGS_DEFAULTS.ignoreLocalThemeSwap,
  };

  // Inject --accent / --accent-hover CSS variables globally
  useEffect(() => {
    document.documentElement.style.setProperty('--accent',       s.accentColor);
    document.documentElement.style.setProperty('--accent-hover', lightenHex(s.accentColor, 0.2));
  }, [s.accentColor]);

  // Inject color scheme onto <html data-scheme="...">
  useEffect(() => {
    document.documentElement.dataset.scheme = s.colorScheme;
  }, [s.colorScheme]);

  const updateSettings = (patch: Partial<AppSettings>) =>
    setSettings(prev => ({ ...(prev ?? SETTINGS_DEFAULTS), ...patch }));

  return (
    <Ctx.Provider value={{ ...s, updateSettings }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
