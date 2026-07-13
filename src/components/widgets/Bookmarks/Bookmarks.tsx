import { useState, useEffect } from 'react';
import type { BookmarksData } from '../../../types/widget';
import './Bookmarks.css';

const isExtension = typeof chrome !== 'undefined' && !!chrome.storage;

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

// ── Types ──────────────────────────────────────────────────────────────────

interface BmNode {
  id: string;
  title: string;
  url?: string;
  children?: BmNode[];
}

interface NavEntry { id: string; name: string; }

// ── Folder tree picker (settings) ─────────────────────────────────────────

interface FolderNodeProps {
  node: BmNode;
  selectedId: string;
  onSelect: (id: string, name: string) => void;
  depth: number;
}

function FolderNode({ node, selectedId, onSelect, depth }: FolderNodeProps) {
  const [open, setOpen] = useState(depth < 2);
  const folders = node.children?.filter(c => !c.url) ?? [];
  if (!node.id) return null;

  return (
    <div className="sg-bm-folder-node" style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
      <div
        className={`sg-bm-folder-row${selectedId === node.id ? ' selected' : ''}`}
        onClick={() => onSelect(node.id, node.title)}
      >
        {folders.length > 0 && (
          <span className="sg-bm-folder-toggle" onClick={e => { e.stopPropagation(); setOpen(s => !s); }}>
            {open ? '▾' : '▸'}
          </span>
        )}
        <span className="sg-bm-folder-icon">📁</span>
        <span className="sg-bm-folder-name">{node.title || '(Root)'}</span>
      </div>
      {open && folders.map(f => (
        <FolderNode key={f.id} node={f} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}

// ── Settings panel ─────────────────────────────────────────────────────────

interface SettingsProps {
  data: BookmarksData;
  onUpdateData: (patch: Partial<BookmarksData>) => void;
}

export function BookmarksSettings({ data, onUpdateData }: SettingsProps) {
  const [tree, setTree] = useState<BmNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isExtension) { setLoading(false); return; }
    import('webextension-polyfill').then(({ default: browser }) => {
      browser.bookmarks.getTree().then(nodes => {
        setTree(nodes as BmNode[]);
        setLoading(false);
      });
    });
  }, []);

  const iconSize = data.iconSize ?? 'medium';

  return (
    <div className="sg-bm-settings" onClick={e => e.stopPropagation()}>

      <div className="sg-bm-settings-row">
        <span className="sg-bm-settings-label">Layout</span>
        <div className="sg-bm-toggle-group">
          {(['grid', 'list'] as const).map(v => (
            <button key={v} className={`sg-bm-toggle-btn${data.layout === v ? ' active' : ''}`}
              onClick={() => onUpdateData({ layout: v })}>
              {v === 'grid' ? 'Grid' : 'List'}
            </button>
          ))}
        </div>
      </div>

      <div className="sg-bm-settings-row">
        <span className="sg-bm-settings-label">Icon size</span>
        <div className="sg-bm-toggle-group">
          {(['small', 'medium', 'large'] as const).map(v => (
            <button key={v} className={`sg-bm-toggle-btn${iconSize === v ? ' active' : ''}`}
              onClick={() => onUpdateData({ iconSize: v })}>
              {v === 'small' ? 'S' : v === 'medium' ? 'M' : 'L'}
            </button>
          ))}
        </div>
      </div>

      <span className="sg-bm-settings-label">Root folder</span>

      {!isExtension ? (
        <p className="sg-bm-unavailable">Bookmarks are only available in the Firefox extension.</p>
      ) : loading ? (
        <p className="sg-bm-loading">Loading bookmarks…</p>
      ) : (
        <div className="sg-bm-folder-tree">
          {tree[0]?.children?.map(n => (
            <FolderNode key={n.id} node={n} selectedId={data.folderId}
              onSelect={(id, name) => onUpdateData({ folderId: id, folderName: name })}
              depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Single item (bookmark or folder) ──────────────────────────────────────

interface BmItemProps {
  node: BmNode;
  iconSize: 'small' | 'medium' | 'large';
  onFolderClick?: (node: BmNode) => void;
}

function BmItem({ node, iconSize, onFolderClick }: BmItemProps) {
  const [faviconIdx, setFaviconIdx] = useState(0);
  const isFolder = !node.url;
  const title = node.title || (node.url ? (() => { try { return new URL(node.url!).hostname; } catch { return node.url!; } })() : '');

  const hostname = node.url ? hostnameOf(node.url) : '';
  const chain = faviconChain(hostname);
  const faviconSrc = chain[faviconIdx] ?? null;

  const showFaviconImg = !isFolder && !!faviconSrc;

  const content = (
    <>
      <span className={`sg-bm-icon sg-bm-icon--${iconSize}${showFaviconImg ? ' sg-bm-icon--favicon' : ''}`}>
        {isFolder ? (
          <span className="sg-bm-folder-emoji">📁</span>
        ) : faviconSrc ? (
          <img src={faviconSrc} alt="" onError={() => setFaviconIdx(i => i + 1)} />
        ) : (
          <span className="sg-bm-fallback">{title.charAt(0).toUpperCase()}</span>
        )}
      </span>
      <span className="sg-bm-title">{title}</span>
    </>
  );

  if (isFolder) {
    return (
      <div className="sg-bm-link sg-bm-link--folder" title={title}
        onClick={() => onFolderClick?.(node)}>
        {content}
      </div>
    );
  }

  return (
    <a className="sg-bm-link" href={node.url} title={title}>
      {content}
    </a>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────

interface Props {
  data: BookmarksData;
  onUpdateData: (patch: Partial<BookmarksData>) => void;
}

export default function Bookmarks({ data, onUpdateData: _onUpdateData }: Props) {
  const [items, setItems] = useState<BmNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [navStack, setNavStack] = useState<NavEntry[]>([]);

  const currentId = navStack.length > 0 ? navStack[navStack.length - 1].id : data.folderId;

  useEffect(() => { setNavStack([]); }, [data.folderId]);

  useEffect(() => {
    if (!currentId || !isExtension) return;
    setLoading(true);
    import('webextension-polyfill').then(({ default: browser }) => {
      browser.bookmarks.getChildren(currentId).then(children => {
        setItems(children as BmNode[]);
        setLoading(false);
      }).catch(() => setLoading(false));
    });
  }, [currentId]);

  if (!isExtension) {
    return (
      <div className="sg-bm sg-bm--empty">
        <span className="sg-bm-empty-icon">🔖</span>
        <span className="sg-bm-empty-text">Only available in the Firefox extension</span>
      </div>
    );
  }

  if (!data.folderId) {
    return (
      <div className="sg-bm sg-bm--empty">
        <span className="sg-bm-empty-icon">📁</span>
        <span className="sg-bm-empty-text">Open ⚙ to pick a folder</span>
      </div>
    );
  }

  const layout = data.layout ?? 'grid';
  const iconSize = data.iconSize ?? 'medium';

  const breadcrumb: NavEntry[] = [
    { id: data.folderId, name: data.folderName || '📁' },
    ...navStack,
  ];

  const navigate = (node: BmNode) => {
    setNavStack(prev => [...prev, { id: node.id, name: node.title }]);
  };

  const breadcrumbTo = (idx: number) => {
    setNavStack(prev => prev.slice(0, idx));
  };

  return (
    <div className="sg-bm">
      {breadcrumb.length > 1 && (
        <div className="sg-bm-breadcrumb">
          {breadcrumb.map((entry, idx) => (
            <span key={entry.id} className="sg-bm-breadcrumb-item">
              {idx > 0 && <span className="sg-bm-breadcrumb-sep">›</span>}
              <button
                className={`sg-bm-breadcrumb-btn${idx === breadcrumb.length - 1 ? ' current' : ''}`}
                onClick={() => breadcrumbTo(idx)}
              >{entry.name}</button>
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="sg-bm sg-bm--empty"><span className="sg-bm-empty-text">Loading…</span></div>
      ) : (
        <div className={`sg-bm-links sg-bm-links--${layout}`}>
          {items.length === 0 ? (
            <span className="sg-bm-empty-text">Folder is empty</span>
          ) : (
            items.map(item => (
              <BmItem key={item.id} node={item} iconSize={iconSize} onFolderClick={navigate} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
