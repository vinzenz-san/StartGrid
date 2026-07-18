import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useEditMode } from '../../contexts/EditModeContext';
import { useWidgets } from '../../contexts/WidgetContext';
import { useSettings } from '../../contexts/SettingsContext';
import { SettingsSwitch } from '../shared/Form';
import './DevPanel.css';

const isExtension = typeof chrome !== 'undefined' && !!chrome.storage;

export interface DevPanelPos { x: number; y: number; }

export const DEV_PANEL_WIDTH = 264;
const DEV_PANEL_MARGIN = 16;
const DEV_PANEL_POS_KEY = 'sg:devPanelPos';

export function readSavedDevPanelPos(): DevPanelPos | null {
  try {
    const raw = localStorage.getItem(DEV_PANEL_POS_KEY);
    return raw ? (JSON.parse(raw) as DevPanelPos) : null;
  } catch {
    return null;
  }
}

function writeSavedDevPanelPos(pos: DevPanelPos) {
  try { localStorage.setItem(DEV_PANEL_POS_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
}

const SYNC_LIMIT  = 102_400;       // 100 KB — hard Firefox sync quota
const LOCAL_LIMIT = 10 * 1024 * 1024; // 10 MB — soft display cap

function fmtBytes(n: number): string {
  if (n < 1024)          return `${n} B`;
  if (n < 1024 * 1024)   return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

interface KeyEntry  { key: string; bytes: number; }
interface StoreData { used: number; keys: KeyEntry[]; }

interface Stats {
  sync:  StoreData;
  local: StoreData;
}

function toEntries(obj: Record<string, unknown>): KeyEntry[] {
  return Object.entries(obj)
    .map(([key, val]) => ({ key, bytes: new TextEncoder().encode(JSON.stringify(val)).length }))
    .sort((a, b) => b.bytes - a.bytes);
}

async function fetchStats(): Promise<Stats> {
  if (!isExtension) {
    // Dev fallback: read from localStorage using our storage key prefixes
    let syncUsed = 0; const syncKeys: KeyEntry[] = [];
    let localUsed = 0; const localKeys: KeyEntry[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      const raw = localStorage.getItem(k) ?? '';
      const bytes = new TextEncoder().encode(raw).length;
      if (k.startsWith('sg:')) { syncUsed += bytes; syncKeys.push({ key: k.slice(3), bytes }); }
      else if (k.startsWith('sg-local:')) { localUsed += bytes; localKeys.push({ key: k.slice(9), bytes }); }
    }
    return {
      sync:  { used: syncUsed,  keys: syncKeys.sort((a, b) => b.bytes - a.bytes) },
      local: { used: localUsed, keys: localKeys.sort((a, b) => b.bytes - a.bytes) },
    };
  }

  const { default: browser } = await import('webextension-polyfill');

  const [syncUsed, syncAll, localAll] = await Promise.all([
    browser.storage.sync.getBytesInUse(null) as Promise<number>,
    browser.storage.sync.get(null)  as Promise<Record<string, unknown>>,
    browser.storage.local.get(null) as Promise<Record<string, unknown>>,
  ]);

  let localUsed = 0;
  try {
    localUsed = await (browser.storage.local.getBytesInUse(null) as Promise<number>);
  } catch {
    localUsed = new TextEncoder().encode(JSON.stringify(localAll)).length;
  }

  return {
    sync:  { used: syncUsed,  keys: toEntries(syncAll) },
    local: { used: localUsed, keys: toEntries(localAll) },
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Bar({ used, limit }: { used: number; limit: number }) {
  const pct    = Math.min(100, (used / limit) * 100);
  const danger = pct >= 90;
  const warn   = pct >= 70 && !danger;
  return (
    <div className="dev-bar-track">
      <div
        className={`dev-bar-fill${warn ? ' warn' : ''}${danger ? ' danger' : ''}`}
        style={{ width: `${pct.toFixed(1)}%` }}
      />
    </div>
  );
}

function StoreSection({ title, data, limit }: { title: string; data: StoreData; limit: number }) {
  return (
    <div className="dev-store-section">
      <div className="dev-store-header">
        <span className="dev-store-title">{title}</span>
        <span className="dev-store-bytes">{fmtBytes(data.used)} / {fmtBytes(limit)}</span>
      </div>
      <Bar used={data.used} limit={limit} />
      <div className="dev-key-list">
        {data.keys.slice(0, 5).map(e => (
          <div key={e.key} className="dev-key-row">
            <span className="dev-key-name">{e.key}</span>
            <span className="dev-key-size">~{fmtBytes(e.bytes)}</span>
          </div>
        ))}
        {data.keys.length === 0 && <span className="dev-key-empty">empty</span>}
      </div>
    </div>
  );
}

// ── Inner panel (holds all hooks) ──────────────────────────────────────────

interface Props {
  position: DevPanelPos | null;
  onPositionChange: (pos: DevPanelPos) => void;
}

function DevPanelInner({ position, onPositionChange }: Props) {
  const { isEditMode }   = useEditMode();
  const { widgets, loaded } = useWidgets();
  const { settingsButtonPosition, elementInspectorEnabled, updateSettings } = useSettings();
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef  = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const posRef   = useRef(position);
  const hasDraggedRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  useEffect(() => { posRef.current = position; }, [position]);

  const snapToSidebar = useCallback((height: number) => {
    const sidebarOnLeft = settingsButtonPosition.endsWith('left');
    const x = sidebarOnLeft ? window.innerWidth - DEV_PANEL_WIDTH - DEV_PANEL_MARGIN : DEV_PANEL_MARGIN;
    const y = window.innerHeight - height - DEV_PANEL_MARGIN;
    onPositionChange({ x, y });
  }, [settingsButtonPosition, onPositionChange]);

  // Force-reset on every mount: DevPanel only mounts when Dev Mode is freshly
  // turned on, so it must always dynamically snap to the bottom corner opposite
  // the sidebar — any stored drag position from a prior session is discarded.
  useEffect(() => {
    try { localStorage.removeItem(DEV_PANEL_POS_KEY); } catch { /* ignore */ }
    hasDraggedRef.current = false;
    snapToSidebar(panelRef.current?.getBoundingClientRect().height ?? 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-snap to the actual bottom edge whenever the panel's rendered height
  // changes (e.g. once the async storage-stats data resolves) — but only
  // until the user takes over with a manual drag.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (hasDraggedRef.current) return;
      snapToSidebar(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [snapToSidebar]);

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if (!posRef.current) return;
    hasDraggedRef.current = true;
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: posRef.current.x, origY: posRef.current.y };
    setDragging(true);
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      onPositionChange({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
    };
    const handleUp = () => {
      setDragging(false);
      dragRef.current = null;
      if (posRef.current) writeSavedDevPanelPos(posRef.current);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, onPositionChange]);

  const devPanelStyle: CSSProperties = position
    ? { left: position.x, top: position.y }
    : { visibility: 'hidden' };

  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchStats()
      .then(s  => { setStats(s); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div ref={panelRef} className="dev-panel" style={devPanelStyle}>
      <div className="dev-panel-header" onMouseDown={handleHeaderMouseDown}>
        <span className="dev-panel-title">DEV</span>
      </div>

      <div className="dev-row">
        <span className="dev-label">Storage</span>
        <span className={`dev-badge ${isExtension ? 'ok' : 'warn'}`}>
          {isExtension ? 'extension' : 'localStorage'}
        </span>
      </div>
      <div className="dev-row">
        <span className="dev-label">Edit-Mode</span>
        <span className={`dev-badge ${isEditMode ? 'ok' : 'off'}`}>
          {isEditMode ? 'ON' : 'OFF'}
        </span>
      </div>
      <div className="dev-row">
        <span className="dev-label">Widgets</span>
        <span className={`dev-badge ${loaded ? 'ok' : 'warn'}`}>
          {loaded ? (widgets?.length ?? 0) : '…'}
        </span>
      </div>
      <div className="dev-row">
        <span className="dev-label">Element Inspector</span>
        <SettingsSwitch
          checked={elementInspectorEnabled}
          onChange={v => updateSettings({ elementInspectorEnabled: v })}
        />
      </div>

      <div className="dev-divider" />

      {loading ? (
        <div className="dev-loading">Calculating…</div>
      ) : stats ? (
        <>
          <StoreSection title="Sync (Cloud)" data={stats.sync}  limit={SYNC_LIMIT}  />
          <div className="dev-store-gap" />
          <StoreSection title="Local (PC)"   data={stats.local} limit={LOCAL_LIMIT} />
        </>
      ) : (
        <div className="dev-loading">Unavailable</div>
      )}

      <div className="dev-divider" />

      <div className="dev-footer">
        <button className="dev-refresh-btn" onClick={refresh} disabled={loading}>
          ⟳ Refresh
        </button>
        <span className="dev-hint">Ctrl+E</span>
      </div>
    </div>
  );
}

export default function DevPanel({ position, onPositionChange }: Props) {
  return <DevPanelInner position={position} onPositionChange={onPositionChange} />;
}
