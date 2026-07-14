import { useState, useEffect, useRef } from 'react';
import type { BookmarksData as BookmarkExplorerData } from '../../../types/widget';
import { SettingsRow, SettingsSwitch } from '../../shared/Form';
import { useBookmarkExplorer } from './useBookmarkExplorer';
import type { BmNode } from './bookmarks.mock';
import './BookmarkExplorer.css';

// ── Helpers ────────────────────────────────────────────────────────────────────

function hostnameOf(url: string): string {
  try { return new URL(url).hostname; } catch { return ''; }
}

function faviconUrl(hostname: string): string {
  return `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
}

// ── Folder picker (settings only) ─────────────────────────────────────────────

interface FolderPickerNodeProps {
  node:       BmNode;
  selectedId: string;
  onSelect:   (id: string, title: string) => void;
  depth:      number;
}

function FolderPickerNode({ node, selectedId, onSelect, depth }: FolderPickerNodeProps) {
  const [open, setOpen] = useState(depth < 2);
  const subFolders = node.children?.filter(c => !c.url) ?? [];

  if (!node.id) {
    return (
      <>
        {subFolders.map(f => (
          <FolderPickerNode key={f.id} node={f} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
        ))}
      </>
    );
  }

  return (
    <div className="sg-bx-fp-node" style={{ paddingLeft: depth > 0 ? depth * 12 : 0 }}>
      <div
        className={`sg-bx-fp-row${selectedId === node.id ? ' sg-bx-fp-row--selected' : ''}`}
        onClick={() => onSelect(node.id, node.title)}
      >
        {subFolders.length > 0 && (
          <span
            className="sg-bx-fp-toggle"
            onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
          >
            {open ? '▾' : '▸'}
          </span>
        )}
        <span className="sg-bx-fp-icon">📁</span>
        <span className="sg-bx-fp-name">{node.title || '(Root)'}</span>
      </div>
      {open && subFolders.map(f => (
        <FolderPickerNode key={f.id} node={f} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}

// ── Settings ───────────────────────────────────────────────────────────────────

interface SettingsProps {
  data:         BookmarkExplorerData;
  onUpdateData: (patch: Partial<BookmarkExplorerData>) => void;
}

export function BookmarkExplorerSettings({ data, onUpdateData }: SettingsProps) {
  const bookmarks = useBookmarkExplorer();
  const [tree, setTree]       = useState<BmNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);

  useEffect(() => {
    bookmarks.getTree().then(t => { setTree(t); setTreeLoading(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedId = data.rootFolderId ?? '1';

  return (
    <div className="sg-bx-settings" onClick={e => e.stopPropagation()}>
      <SettingsRow label="Show icons">
        <SettingsSwitch checked={data.showIcons} onChange={v => onUpdateData({ showIcons: v })} />
      </SettingsRow>
      <SettingsRow label="Compact mode">
        <SettingsSwitch checked={data.compactMode} onChange={v => onUpdateData({ compactMode: v })} />
      </SettingsRow>

      <div className="sg-bx-settings-divider" />

      <span className="sg-bx-settings-label">Root folder</span>
      {bookmarks.isMock && (
        <p className="sg-bx-settings-note">Mock data — real bookmarks available in the extension.</p>
      )}
      {treeLoading ? (
        <p className="sg-bx-settings-note">Loading…</p>
      ) : (
        <div className="sg-bx-fp-tree">
          {tree[0]?.children?.map(n => (
            <FolderPickerNode
              key={n.id}
              node={n}
              selectedId={selectedId}
              onSelect={(id, title) => onUpdateData({ rootFolderId: id })}
              depth={0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Item row ───────────────────────────────────────────────────────────────────

interface ItemRowProps {
  node:          BmNode;
  showIcons:     boolean;
  compact:       boolean;
  onFolderClick: (node: BmNode) => void;
}

function ItemRow({ node, showIcons, compact, onFolderClick }: ItemRowProps) {
  const [iconError, setIconError] = useState(false);
  const isFolder  = !node.url;
  const hostname  = node.url ? hostnameOf(node.url) : '';
  const favicon   = hostname ? faviconUrl(hostname) : null;
  const initial   = (node.title || node.url || '?').charAt(0).toUpperCase();
  const cls       = `sg-bx-item${compact ? ' sg-bx-item--compact' : ''}${isFolder ? ' sg-bx-item--folder' : ''}`;

  const icon = isFolder ? (
    <span className="sg-bx-item-icon sg-bx-item-icon--folder">📁</span>
  ) : showIcons && favicon && !iconError ? (
    <img
      className="sg-bx-item-icon sg-bx-item-icon--favicon"
      src={favicon}
      alt=""
      onError={() => setIconError(true)}
    />
  ) : (
    <span className="sg-bx-item-icon sg-bx-item-icon--initial">{initial}</span>
  );

  if (isFolder) {
    return (
      <div className={cls} title={node.title} onClick={() => onFolderClick(node)}>
        {icon}
        <span className="sg-bx-item-title">{node.title || '(Unnamed folder)'}</span>
        <span className="sg-bx-item-chevron">›</span>
      </div>
    );
  }

  return (
    <a className={cls} href={node.url} title={node.title}>
      {icon}
      <span className="sg-bx-item-title">{node.title || hostname || node.url}</span>
    </a>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────────

interface NavEntry { id: string; name: string; }

interface Props {
  data:         BookmarkExplorerData;
  onUpdateData: (patch: Partial<BookmarkExplorerData>) => void;
}

export default function BookmarkExplorer({ data }: Props) {
  const bookmarks     = useBookmarkExplorer();
  const rootFolderId  = data.rootFolderId ?? '1';

  const [navStack,     setNavStack]     = useState<NavEntry[]>([]);
  const [rootName,     setRootName]     = useState('Bookmarks');
  const [items,        setItems]        = useState<BmNode[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [query,        setQuery]        = useState('');
  const [searchResults, setSearchResults] = useState<BmNode[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const currentId = navStack.length > 0 ? navStack[navStack.length - 1].id : rootFolderId;

  // Reset navigation when root folder changes
  useEffect(() => {
    setNavStack([]);
    setQuery('');
    bookmarks.getNode(rootFolderId).then(node => setRootName(node?.title || 'Bookmarks'));
  }, [rootFolderId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load children for current folder (skip in search mode)
  useEffect(() => {
    if (query) return;
    setLoading(true);
    bookmarks.getChildren(currentId)
      .then(children => { setItems(children); setLoading(false); })
      .catch(() => setLoading(false));
  }, [currentId, query]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live search
  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); return; }
    bookmarks.search(query.trim()).then(setSearchResults);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  function enterFolder(node: BmNode) {
    setNavStack(prev => [...prev, { id: node.id, name: node.title || '(Folder)' }]);
  }

  function goToBreadcrumb(index: number) {
    // index 0 = root; index 1..n = navStack entries
    setNavStack(prev => prev.slice(0, index));
  }

  const breadcrumbs: NavEntry[] = [{ id: rootFolderId, name: rootName }, ...navStack];
  const isSearching = query.trim().length > 0;
  const displayItems = isSearching ? searchResults : items;

  return (
    <div className="sg-bx">
      {/* Header */}
      <div className="sg-bx-header">
        <div className="sg-bx-search-row">
          <span className="sg-bx-search-icon">⌕</span>
          <input
            ref={searchRef}
            className="sg-bx-search"
            type="text"
            placeholder="Search bookmarks…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onPointerDown={e => e.stopPropagation()}
          />
          {query && (
            <button className="sg-bx-search-clear" onClick={() => { setQuery(''); searchRef.current?.focus(); }}>
              ✕
            </button>
          )}
        </div>

        {!isSearching && (
          <div className="sg-bx-breadcrumb">
            {breadcrumbs.map((entry, idx) => (
              <span key={`${entry.id}-${idx}`} className="sg-bx-breadcrumb-item">
                {idx > 0 && <span className="sg-bx-breadcrumb-sep">›</span>}
                <button
                  className={`sg-bx-breadcrumb-btn${idx === breadcrumbs.length - 1 ? ' sg-bx-breadcrumb-btn--current' : ''}`}
                  onClick={() => goToBreadcrumb(idx)}
                >
                  {entry.name}
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="sg-bx-body">
        {loading && !isSearching ? (
          <div className="sg-bx-empty">
            <span className="sg-bx-empty-text">Loading…</span>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="sg-bx-empty">
            <span className="sg-bx-empty-icon">{isSearching ? '🔍' : '📁'}</span>
            <span className="sg-bx-empty-text">{isSearching ? 'No results' : 'Folder is empty'}</span>
          </div>
        ) : (
          <div className="sg-bx-list">
            {displayItems.map(item => (
              <ItemRow
                key={item.id}
                node={item}
                showIcons={data.showIcons}
                compact={data.compactMode}
                onFolderClick={enterFolder}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
