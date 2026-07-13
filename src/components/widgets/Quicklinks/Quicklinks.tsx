import { useState, useEffect, useRef } from 'react';
import type { QuickLink, QuicklinksData } from '../../../types/widget';
import './Quicklinks.css';

function hostnameOf(url: string): string {
  try {
    const { hostname } = new URL(url);
    return hostname;
  } catch {
    return '';
  }
}

function faviconChain(hostname: string): string[] {
  if (!hostname) return [];
  return [
    `https://icons.duckduckgo.com/ip3/${hostname}.ico`,
    `https://www.google.com/s2/favicons?sz=64&domain=${hostname}&default=404`,
    `https://unavatar.io/${hostname}?fallback=clear`,
  ];
}

async function processIconUpload(file: File): Promise<string | null> {
  if (file.size > 32 * 1024) {
    alert('Image must be 32 KB or smaller.');
    return null;
  }
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        if (img.width > 64 || img.height > 64) {
          alert(`Image must be 64×64 px or smaller (got ${img.width}×${img.height}).`);
          resolve(null);
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => { alert('Could not read image.'); resolve(null); };
      img.src = dataUrl;
    };
    reader.onerror = () => { alert('Could not read file.'); resolve(null); };
    reader.readAsDataURL(file);
  });
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

function openInternalUrl(url: string, newTab: boolean) {
  const inExtension = typeof browser !== 'undefined' && !!browser.tabs;
  if (inExtension) {
    const action = newTab
      ? browser.tabs.create({ url })
      : browser.tabs.update({ url });
    action.catch(() => clipboardFallback(url));
  } else {
    clipboardFallback(url);
  }
}

function LinkItem({ link, iconSize, showTitle }: LinkItemProps) {
  const [faviconIdx, setFaviconIdx] = useState(0);
  const [customImgError, setCustomImgError] = useState(false);
  const isInternal = INTERNAL_URL.test(link.url);
  const label = displayTitle(link);
  const iconSource = link.iconSource ?? 'auto';

  const hostname = hostnameOf(link.url);
  const chain = faviconChain(hostname);
  const faviconSrc = chain[faviconIdx] ?? null;
  const fallback = <span className="sg-ql-fallback">{label.charAt(0).toUpperCase()}</span>;

  let iconInner: React.ReactNode;
  let isFaviconImg = false;
  if (iconSource !== 'auto' && link.customIcon) {
    iconInner = customImgError
      ? fallback
      : <img src={link.customIcon} alt="" onError={() => setCustomImgError(true)} />;
    isFaviconImg = !customImgError;
  } else if (iconSource === 'auto' && link.customIcon) {
    iconInner = link.customIcon.startsWith('data:')
      ? <img src={link.customIcon} alt="" />
      : <span className="sg-ql-emoji">{link.customIcon}</span>;
    isFaviconImg = link.customIcon.startsWith('data:');
  } else {
    iconInner = faviconSrc
      ? <img src={faviconSrc} alt="" onError={() => setFaviconIdx(i => i + 1)} />
      : fallback;
    isFaviconImg = !!faviconSrc;
  }

  const iconContent = (
    <span className={`sg-ql-icon sg-ql-icon--${iconSize}${isFaviconImg ? ' sg-ql-icon--favicon' : ''}`}>
      {iconInner}
    </span>
  );

  if (isInternal) {
    return (
      <button
        className={`sg-ql-link sg-ql-link--${iconSize}`}
        title={label}
        onMouseDown={e => { if (e.button === 1) { e.preventDefault(); openInternalUrl(link.url, true); } }}
        onClick={() => openInternalUrl(link.url, false)}
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

export function QuicklinksSettings({ data, onUpdateData }: SettingsProps) {
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
                <div className="sg-ql-icon-source-row">
                  <span className="sg-ql-settings-label">Icon</span>
                  <div className="sg-ql-toggle-group">
                    {(['auto', 'custom-url', 'upload'] as const).map(src => (
                      <button key={src}
                        className={`sg-ql-toggle-btn${(link.iconSource ?? 'auto') === src ? ' active' : ''}`}
                        onClick={() => updateLink(link.id, { iconSource: src, customIcon: undefined })}
                      >{src === 'auto' ? 'Auto' : src === 'custom-url' ? 'URL' : 'Upload'}</button>
                    ))}
                  </div>
                </div>
                {link.iconSource === 'custom-url' && (
                  <input className="sg-ql-input" placeholder="Image URL" draggable={false}
                    value={link.customIcon ?? ''}
                    onChange={e => updateLink(link.id, { customIcon: e.target.value || undefined })}
                    onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
                    onDragStart={e => e.stopPropagation()} />
                )}
                {link.iconSource === 'upload' && (
                  <div className="sg-ql-upload-row">
                    {link.customIcon && <img className="sg-ql-upload-preview" src={link.customIcon} alt="" />}
                    <label className="sg-ql-upload-label">
                      {link.customIcon ? 'Change…' : 'Choose image…'}
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={async e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const dataUrl = await processIconUpload(file);
                          if (dataUrl) updateLink(link.id, { customIcon: dataUrl });
                          e.target.value = '';
                        }}
                        onPointerDown={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                      />
                    </label>
                    {link.customIcon && (
                      <button className="sg-ql-action-btn danger"
                        onClick={() => updateLink(link.id, { customIcon: undefined })}>✕</button>
                    )}
                  </div>
                )}
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
  onUpdateData: (patch: Partial<QuicklinksData>) => void;
}

export default function Quicklinks({ data, onUpdateData: _onUpdateData }: Props) {
  const { links = [], layout = 'grid' } = data;
  const iconSize = data.iconSize ?? 'medium';
  const showTitles = data.showTitles ?? true;

  const containerRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      setCompact(entries[0].contentRect.height < 96);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const effectiveLayout    = compact ? 'row'   : layout;
  const effectiveIconSize  = compact ? 'small' : iconSize;
  const effectiveShowTitles = compact ? false  : showTitles;

  return (
    <div className="sg-ql" ref={containerRef}>
      {links.length === 0 ? (
        <div className="sg-ql sg-ql--empty">
          <span className="sg-ql-empty">No links. Open ⚙ to add some.</span>
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
