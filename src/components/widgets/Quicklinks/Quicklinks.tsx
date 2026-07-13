import { useState, useEffect, useRef } from 'react';
import type { QuickLink, QuicklinksData } from '../../../types/widget';
import './Quicklinks.css';

function faviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return '';
  }
}

function displayTitle(link: QuickLink): string {
  if (link.title) return link.title;
  try {
    return new URL(link.url).hostname.replace(/^www\./, '');
  } catch {
    return link.url;
  }
}

function generateId() {
  return `ql-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Single link item ───────────────────────────────────────────────────────

interface LinkItemProps {
  link: QuickLink;
  iconSize: 'small' | 'medium' | 'large';
  showTitle: boolean;
}

const INTERNAL_URL = /^(about|chrome|edge|moz-extension):/i;

function clipboardFallback(url: string) {
  navigator.clipboard.writeText(url).catch(() => {});
  alert(`Firefox security restricts opening 'about:' pages directly. The URL '${url}' has been copied to your clipboard. Please paste it into a new tab manually!`);
}

function openInternalUrl(url: string) {
  const inExtension = typeof browser !== 'undefined' && !!browser.tabs;
  console.log('Opening internal URL:', url, 'Extension context:', inExtension);
  if (inExtension) {
    browser.tabs.create({ url }).catch((err: unknown) => {
      console.error('browser.tabs.create failed for', url, err);
      clipboardFallback(url);
    });
  } else {
    clipboardFallback(url);
  }
}

function LinkItem({ link, iconSize, showTitle }: LinkItemProps) {
  const [imgError, setImgError] = useState(false);
  const favicon = faviconUrl(link.url);
  const isInternal = INTERNAL_URL.test(link.url);
  const label = displayTitle(link);

  const iconContent = (
    <span className={`sg-ql-icon sg-ql-icon--${iconSize}`}>
      {link.customIcon ? (
        link.customIcon.startsWith('data:') ? (
          <img src={link.customIcon} alt="" />
        ) : (
          <span className="sg-ql-emoji">{link.customIcon}</span>
        )
      ) : favicon && !imgError ? (
        <img src={favicon} alt="" onError={() => setImgError(true)} />
      ) : (
        <span className="sg-ql-fallback">{label.charAt(0).toUpperCase()}</span>
      )}
    </span>
  );

  if (isInternal) {
    return (
      <button
        className={`sg-ql-link sg-ql-link--${iconSize}`}
        title={label}
        onClick={() => openInternalUrl(link.url)}
      >
        {iconContent}
        {showTitle && <span className="sg-ql-title">{label}</span>}
      </button>
    );
  }

  return (
    <a
      className={`sg-ql-link sg-ql-link--${iconSize}`}
      href={link.url}
      title={label}
      target="_blank"
      rel="noopener noreferrer"
    >
      {iconContent}
      {showTitle && <span className="sg-ql-title">{label}</span>}
    </a>
  );
}

// ── Settings panel ─────────────────────────────────────────────────────────

interface SettingsProps {
  data: QuicklinksData;
  onUpdateData: (patch: Partial<QuicklinksData>) => void;
}

function Toggle({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="sg-ql-toggle-group">
      {options.map(o => (
        <button
          key={o.value}
          className={`sg-ql-toggle-btn${value === o.value ? ' active' : ''}`}
          onClick={() => onChange(o.value)}
        >{o.label}</button>
      ))}
    </div>
  );
}

function QuicklinksSettings({ data, onUpdateData }: SettingsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState('');

  const iconSize = data.iconSize ?? 'medium';
  const showTitles = data.showTitles ?? true;
  const layout = data.layout ?? 'grid';

  const updateLink = (id: string, patch: Partial<QuickLink>) => {
    onUpdateData({ links: data.links.map(l => l.id === id ? { ...l, ...patch } : l) });
  };

  const removeLink = (id: string) => {
    onUpdateData({ links: data.links.filter(l => l.id !== id) });
    if (editingId === id) setEditingId(null);
  };

  const addLink = () => {
    const url = newUrl.trim();
    if (!url) return;
    const isInternal = /^(about|chrome|edge|moz-extension):/i.test(url);
    const fullUrl = (isInternal || url.startsWith('http')) ? url : `https://${url}`;
    onUpdateData({ links: [...data.links, { id: generateId(), url: fullUrl, showTitle: true }] });
    setNewUrl('');
  };

  const moveLink = (id: string, dir: -1 | 1) => {
    const links = [...data.links];
    const idx = links.findIndex(l => l.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= links.length) return;
    [links[idx], links[swapIdx]] = [links[swapIdx], links[idx]];
    onUpdateData({ links });
  };

  return (
    <div className="sg-ql-settings" onClick={e => e.stopPropagation()}>

      <div className="sg-ql-settings-row">
        <span className="sg-ql-settings-label">Layout</span>
        <Toggle
          options={[{ value: 'grid', label: 'Grid' }, { value: 'list', label: 'List' }]}
          value={layout}
          onChange={v => onUpdateData({ layout: v as 'grid' | 'list' })}
        />
      </div>

      <div className="sg-ql-settings-row">
        <span className="sg-ql-settings-label">Icon size</span>
        <Toggle
          options={[{ value: 'small', label: 'S' }, { value: 'medium', label: 'M' }, { value: 'large', label: 'L' }]}
          value={iconSize}
          onChange={v => onUpdateData({ iconSize: v as 'small' | 'medium' | 'large' })}
        />
      </div>

      <div className="sg-ql-settings-row">
        <span className="sg-ql-settings-label">Show titles</span>
        <Toggle
          options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
          value={showTitles ? 'on' : 'off'}
          onChange={v => onUpdateData({ showTitles: v === 'on' })}
        />
      </div>

      <div className="sg-ql-link-list">
        {data.links.map((link, idx) => (
          <div key={link.id} className="sg-ql-link-row">
            {editingId === link.id ? (
              <div className="sg-ql-link-edit">
                <input className="sg-ql-input" placeholder="URL" draggable={false}
                  value={link.url} onChange={e => updateLink(link.id, { url: e.target.value })}
                  onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
                  onDragStart={e => e.stopPropagation()} />
                <input className="sg-ql-input" placeholder="Title (empty = domain)" draggable={false}
                  value={link.title ?? ''} onChange={e => updateLink(link.id, { title: e.target.value || undefined })}
                  onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
                  onDragStart={e => e.stopPropagation()} />
                <input className="sg-ql-input" placeholder="Icon (emoji or leave empty)" draggable={false}
                  value={link.customIcon ?? ''} onChange={e => updateLink(link.id, { customIcon: e.target.value || undefined })}
                  onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
                  onDragStart={e => e.stopPropagation()} />
                <button className="sg-ql-action-btn" onClick={() => setEditingId(null)}>Done</button>
              </div>
            ) : (
              <div className="sg-ql-link-summary">
                <span className="sg-ql-link-url">{link.title || displayTitle(link)}</span>
                <div className="sg-ql-link-actions">
                  <button className="sg-ql-action-btn" title="Move up"   onClick={() => moveLink(link.id, -1)} disabled={idx === 0}>↑</button>
                  <button className="sg-ql-action-btn" title="Move down" onClick={() => moveLink(link.id, 1)}  disabled={idx === data.links.length - 1}>↓</button>
                  <button className="sg-ql-action-btn" title="Edit link" onClick={() => setEditingId(link.id)}>
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/></svg>
                  </button>
                  <button className="sg-ql-action-btn danger" title="Delete link" onClick={() => removeLink(link.id)}>
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="sg-ql-add-row">
        <input
          className="sg-ql-input"
          placeholder="Add URL…"
          draggable={false}
          value={newUrl}
          onChange={e => setNewUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addLink(); }}
          onPointerDown={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          onDragStart={e => e.stopPropagation()}
        />
        <button className="sg-ql-action-btn primary" onClick={addLink}>＋</button>
      </div>
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────

interface Props {
  data: QuicklinksData;
  isSettingsOpen: boolean;
  onUpdateData: (patch: Partial<QuicklinksData>) => void;
}

export default function Quicklinks({ data, isSettingsOpen, onUpdateData }: Props) {
  const { links = [], layout = 'grid' } = data;
  const iconSize = data.iconSize ?? 'medium';
  const showTitles = data.showTitles ?? true;

  // Auto-compact: measured on the persistent container so the observer
  // is never torn down when settings open/close.
  const containerRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      // Ignore measurements while settings are covering the widget body
      // (padding-top 40px shrinks visible area, producing false compact reads).
      if (el.closest('.sg-widget-body--settings-open')) return;
      setCompact(entries[0].contentRect.height < 96);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const effectiveLayout   = compact ? 'row'   : layout;
  const effectiveIconSize = compact ? 'small' : iconSize;
  const effectiveShowTitles = compact ? false  : showTitles;

  return (
    // Keep this wrapper always mounted so ResizeObserver is never torn down.
    <div className="sg-ql" ref={containerRef}>
      {isSettingsOpen ? (
        <QuicklinksSettings data={data} onUpdateData={onUpdateData} />
      ) : links.length === 0 ? (
        <div className="sg-ql sg-ql--empty">
          <span className="sg-ql-empty">No links. Open ⚙ in edit mode to add some.</span>
        </div>
      ) : (
        <div className={`sg-ql-links sg-ql-links--${effectiveLayout}`}>
          {links.map(link => (
            <LinkItem
              key={link.id}
              link={link}
              iconSize={effectiveIconSize}
              showTitle={effectiveShowTitles}
            />
          ))}
        </div>
      )}
    </div>
  );
}
