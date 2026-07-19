import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useStorage } from '../hooks/useStorage';
import { lightenHex } from '../lib/colorUtils';
import { DICTIONARIES, interpolate, type TranslationKey } from '../i18n';

const STORAGE_KEY = 'sg:settings';

export type Language             = 'en' | 'de';
export type ColorScheme          = 'light' | 'dark' | 'system';
export type SettingsButtonPosition = 'top-left' | 'top' | 'top-right' | 'bottom-left' | 'bottom' | 'bottom-right';

export interface AppSettings {
  language:                Language;
  colorScheme:             ColorScheme;
  accentColor:             string;
  developerOptionsEnabled: boolean;
  settingsButtonPosition:  SettingsButtonPosition;
  enableCustomContextMenu: boolean;
  settingsPinned:          boolean;
  elementInspectorEnabled: boolean;
}

export const SETTINGS_DEFAULTS = {
  language:                'en',
  colorScheme:             'system',
  accentColor:             '#6366f1',
  developerOptionsEnabled: false,
  settingsButtonPosition:  'bottom',
  enableCustomContextMenu: false,
  settingsPinned:          false,
  elementInspectorEnabled: false,
} as const satisfies AppSettings;


interface SettingsCtx extends AppSettings {
  updateSettings: (patch: Partial<AppSettings>) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
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
    settingsButtonPosition:  (() => {
      const v = (settings ?? SETTINGS_DEFAULTS).settingsButtonPosition ?? SETTINGS_DEFAULTS.settingsButtonPosition;
      return (v === 'left' || v === 'right') ? SETTINGS_DEFAULTS.settingsButtonPosition : v as SettingsButtonPosition;
    })(),
    enableCustomContextMenu: (settings ?? SETTINGS_DEFAULTS).enableCustomContextMenu ?? SETTINGS_DEFAULTS.enableCustomContextMenu,
    settingsPinned:          (settings ?? SETTINGS_DEFAULTS).settingsPinned          ?? SETTINGS_DEFAULTS.settingsPinned,
    elementInspectorEnabled: (settings ?? SETTINGS_DEFAULTS).elementInspectorEnabled ?? SETTINGS_DEFAULTS.elementInspectorEnabled,
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

  const t = (key: TranslationKey, vars?: Record<string, string | number>) =>
    interpolate(DICTIONARIES[s.language][key], vars);

  return (
    <Ctx.Provider value={{ ...s, updateSettings, t }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
