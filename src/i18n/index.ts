import { en, type TranslationKey } from './en';
import { de } from './de';
import type { Language } from '../contexts/SettingsContext';

export type { TranslationKey };

export const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = { en, de };

// BCP-47 locale tags for native Intl formatting (Clock/Calendar date names),
// keyed off the same Language the dictionaries use.
export const LOCALES: Record<Language, string> = { en: 'en-US', de: 'de-DE' };

// Minimal {{var}} interpolation — add only if/when a key actually needs it.
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
}
