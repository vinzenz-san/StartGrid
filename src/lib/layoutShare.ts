import type { Widget } from '../types/widget';

// Focused "share just the layout" export — deliberately its own envelope,
// not BackupRestore.tsx's BackupEnvelope (a full storage.sync + storage.local
// dump). Widget data (storage.sync key `widgets`) never contains OAuth
// tokens (those live in their own sg_google_auth/sg_ms_auth keys — see
// BackupRestore.tsx's SENSITIVE_LOCAL_KEYS) or the Obsidian connection
// (global in storage.local, not part of Widget[]), so a plain widgets-only
// export needs no sensitive-key filtering the way the full backup does.

interface LayoutEnvelope {
  type: 'startgrid-layout';
  version: 1;
  exportedAt: string;
  widgets: Widget[];
}

function isValidEnvelope(data: unknown): data is LayoutEnvelope {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return d.type === 'startgrid-layout' && d.version === 1 && Array.isArray(d.widgets);
}

export function exportLayout(widgets: Widget[]): void {
  const envelope: LayoutEnvelope = {
    type: 'startgrid-layout',
    version: 1,
    exportedAt: new Date().toISOString(),
    widgets,
  };
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `startgrid-layout-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseLayoutFile(file: File): Promise<Widget[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const raw = ev.target?.result;
        if (typeof raw !== 'string') throw new Error('Could not read file.');
        const parsed = JSON.parse(raw) as unknown;
        if (!isValidEnvelope(parsed)) {
          throw new Error('Invalid layout file. Expected a StartGrid layout export.');
        }
        resolve(parsed.widgets);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Unknown error.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsText(file);
  });
}
