/**
 * Daily-note path resolution.
 *
 * Deliberately template-driven rather than delegating to a plugin endpoint:
 * a template works against any vault layout, works identically over the URI
 * transport (which has no endpoints at all), and adds no dependency on which
 * version of the Local REST API plugin the user happens to have installed.
 *
 * Supported tokens, inside `{{date:…}}` or as a bare `{{date}}` (which is
 * equivalent to `{{date:YYYY-MM-DD}}`):
 *   YYYY  4-digit year      MM  2-digit month    DD  2-digit day
 *   HH    2-digit hour24    mm  2-digit minute   ss  2-digit second
 *
 * Longest-token-first ordering matters — replacing `MM` before `mm` would be
 * fine, but replacing a hypothetical `M` first would corrupt `MM`.
 */

const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Format a date against the token subset above. */
export function formatDateTokens(format: string, date: Date): string {
  return format
    .replace(/YYYY/g, String(date.getFullYear()))
    .replace(/MM/g, pad(date.getMonth() + 1))
    .replace(/DD/g, pad(date.getDate()))
    .replace(/HH/g, pad(date.getHours()))
    .replace(/mm/g, pad(date.getMinutes()))
    .replace(/ss/g, pad(date.getSeconds()));
}

/**
 * Expand `{{date}}` / `{{date:FORMAT}}` in a path template.
 * Any other `{{…}}` is left untouched rather than blanked, so a typo shows up
 * as a visibly wrong path instead of silently resolving to a different note.
 */
export function resolvePathTemplate(template: string, now: Date = new Date()): string {
  return template.replace(/\{\{date(?::([^}]*))?\}\}/g, (_match, format?: string) =>
    formatDateTokens(format?.trim() || DEFAULT_DATE_FORMAT, now),
  );
}

/** Vault-relative paths are stored without a leading slash and always end in
 *  `.md`; the REST API and the URI scheme both accept that form. */
export function normalizeVaultPath(path: string): string {
  const trimmed = path.trim().replace(/^\/+/, '');
  if (!trimmed) return '';
  return /\.[a-z0-9]+$/i.test(trimmed) ? trimmed : `${trimmed}.md`;
}

/** Display name for a vault path — basename without extension. */
export function vaultPathToTitle(path: string): string {
  const base = path.split('/').pop() ?? path;
  return base.replace(/\.md$/i, '');
}

export const DEFAULT_DAILY_TEMPLATE = 'Daily/{{date:YYYY-MM-DD}}.md';
