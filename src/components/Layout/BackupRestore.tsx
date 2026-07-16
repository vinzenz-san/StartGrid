import { SETTINGS_DEFAULTS } from '../../contexts/SettingsContext';

// Backup / restore / factory-reset storage logic. Pure functions — SettingsPanel
// renders the Data Management UI and calls directly into these.

const isExtension = typeof chrome !== 'undefined' && !!chrome.storage;

// ── Storage helpers ────────────────────────────────────────────────────────

async function readAllStorage(): Promise<{ sync: Record<string, unknown>; local: Record<string, unknown> }> {
  if (isExtension) {
    const { default: browser } = await import('webextension-polyfill');
    const [sync, local] = await Promise.all([
      browser.storage.sync.get(null),
      browser.storage.local.get(null),
    ]);
    return { sync, local };
  }
  // Dev fallback: collect localStorage keys by prefix
  const sync: Record<string, unknown> = {};
  const local: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    const raw = localStorage.getItem(k)!;
    try {
      if (k.startsWith('sg:'))       sync[k.slice(3)]       = JSON.parse(raw);
      else if (k.startsWith('sg-local:')) local[k.slice(9)] = JSON.parse(raw);
    } catch { /* skip unparseable */ }
  }
  return { sync, local };
}

async function writeAllStorage(sync: Record<string, unknown>, local: Record<string, unknown>): Promise<void> {
  if (isExtension) {
    const { default: browser } = await import('webextension-polyfill');
    await Promise.all([
      browser.storage.sync.set(sync),
      browser.storage.local.set(local),
    ]);
    return;
  }
  Object.entries(sync).forEach(([k, v])  => localStorage.setItem(`sg:${k}`,       JSON.stringify(v)));
  Object.entries(local).forEach(([k, v]) => localStorage.setItem(`sg-local:${k}`, JSON.stringify(v)));
}

async function clearAllStorage(): Promise<void> {
  if (isExtension) {
    const { default: browser } = await import('webextension-polyfill');
    await Promise.all([
      browser.storage.sync.clear(),
      browser.storage.local.clear(),
    ]);
    return;
  }
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (k.startsWith('sg:') || k.startsWith('sg-local:')) keysToRemove.push(k);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

// ── Factory reset ──────────────────────────────────────────────────────────

export async function performFactoryReset(developerOptionsEnabled: boolean): Promise<void> {
  await clearAllStorage();
  if (developerOptionsEnabled) {
    await writeAllStorage(
      { 'sg:settings': { ...SETTINGS_DEFAULTS, developerOptionsEnabled: true } },
      {},
    );
  }
  setTimeout(() => window.location.reload(), 50);
}

// ── Backup envelope ────────────────────────────────────────────────────────

interface BackupEnvelope {
  version: 1;
  exportedAt: string;
  sync: Record<string, unknown>;
  local: Record<string, unknown>;
}

function isValidEnvelope(data: unknown): data is BackupEnvelope {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    d.version === 1 &&
    typeof d.exportedAt === 'string' &&
    d.sync !== null && typeof d.sync === 'object' && !Array.isArray(d.sync) &&
    d.local !== null && typeof d.local === 'object' && !Array.isArray(d.local)
  );
}

// ── Export ───────────────────────────────────────────────────────────────

export async function exportBackup(): Promise<void> {
  const { sync, local } = await readAllStorage();
  const envelope: BackupEnvelope = {
    version: 1,
    exportedAt: new Date().toISOString(),
    sync,
    local,
  };
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `startpage-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Import ───────────────────────────────────────────────────────────────

export function importBackup(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const raw = ev.target?.result;
        if (typeof raw !== 'string') throw new Error('Could not read file.');
        const parsed = JSON.parse(raw) as unknown;
        if (!isValidEnvelope(parsed)) {
          throw new Error('Invalid backup file. Expected a Startpage backup with version, sync, and local keys.');
        }
        await writeAllStorage(parsed.sync, parsed.local);
        resolve();
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Unknown error.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsText(file);
  });
}
