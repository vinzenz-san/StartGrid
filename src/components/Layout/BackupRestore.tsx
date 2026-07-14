import { useRef, useState, useEffect } from 'react';
import { SettingsRow } from '../shared/Form';

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

// ── Component ──────────────────────────────────────────────────────────────

export default function BackupRestore() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError,     setImportError]     = useState<string | null>(null);
  const [importOk,        setImportOk]        = useState(false);
  const [exporting,       setExporting]       = useState(false);
  const [importing,       setImporting]       = useState(false);
  const [confirmPending,  setConfirmPending]  = useState(false);
  const [confirmCooldown, setConfirmCooldown] = useState(false);
  const [countdown,       setCountdown]       = useState(3);

  // 3-second safety lock: count down then unlock
  useEffect(() => {
    if (!confirmCooldown) return;
    setCountdown(3);
    const tick = setInterval(() => {
      setCountdown(n => {
        if (n <= 1) {
          clearInterval(tick);
          setConfirmCooldown(false);
          return 3;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [confirmCooldown]);

  // Auto-cancel if user ignores after cooldown (3 s of inactivity)
  useEffect(() => {
    if (confirmPending && !confirmCooldown) {
      const id = setTimeout(() => setConfirmPending(false), 3000);
      return () => clearTimeout(id);
    }
  }, [confirmPending, confirmCooldown]);

  // ── Export ───────────────────────────────────────────────────────────────
  async function handleExport() {
    setExporting(true);
    try {
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
    } finally {
      setExporting(false);
    }
  }

  // ── Import ───────────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportOk(false);
    setImporting(true);

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
        // Give storage writes a tick to settle before reloading
        setTimeout(() => window.location.reload(), 50);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Unknown error.');
        setImporting(false);
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-imported if needed
    e.target.value = '';
  }

  // ── Factory Reset ─────────────────────────────────────────────────────────
  async function handleReset() {
    if (!confirmPending) {
      setConfirmPending(true);
      setConfirmCooldown(true);
      return;
    }
    if (confirmCooldown) return; // still locked — ignore click
    await clearAllStorage();
    setTimeout(() => window.location.reload(), 50);
  }

  return (
    <div className="sg-settings-backup">
      {/* ── Export ── */}
      <section className="settings-section">
        <div className="settings-section-label">Export</div>
        <SettingsRow label="Backup">
          <button
            className="sg-backup-btn"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Exporting…' : 'Download JSON'}
          </button>
        </SettingsRow>
      </section>

      {/* ── Import ── */}
      <section className="settings-section">
        <div className="settings-section-label">Import</div>
        <SettingsRow label="Restore">
          <button
            className="sg-backup-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? 'Restoring…' : 'Choose file…'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </SettingsRow>
        {importError && (
          <p className="sg-backup-error">{importError}</p>
        )}
        {importOk && (
          <p className="sg-backup-ok">Restored — reloading…</p>
        )}
      </section>

      {/* ── Danger Zone ── */}
      <section className="settings-section" style={{ paddingBottom: 12 }}>
        <div className="settings-section-label">Danger Zone</div>
        <SettingsRow label="Factory Reset">
          <button
            className={`sg-backup-btn sg-backup-btn--danger${confirmPending ? ' sg-backup-btn--confirm' : ''}${confirmCooldown ? ' sg-backup-btn--cooldown' : ''}`}
            onClick={handleReset}
          >
            {confirmPending
              ? confirmCooldown
                ? `Confirm — wipe everything (${countdown}s)`
                : 'Confirm — wipe everything'
              : 'Reset all data'}
          </button>
        </SettingsRow>
        {confirmPending && !confirmCooldown && (
          <p className="sg-backup-error sg-backup-error--warn">
            Click again to permanently erase all settings.
          </p>
        )}
      </section>
    </div>
  );
}
