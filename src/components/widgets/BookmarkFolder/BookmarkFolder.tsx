import { useState, useEffect } from 'react';
import type { BookmarksData as BookmarkFolderData, BookmarkSortMode } from '../../../types/widget';
import { SettingsRow, SettingsSwitch } from '../../shared/Form';
import { useBookmarkFolder } from './useBookmarkFolder';
import type { BmNode } from './bookmarks.mock';
import './BookmarkFolder.css';

// ── Helpers ────────────────────────────────────────────────────────────────────

function hostnameOf(url: string): string {
  try { return new URL(url).hostname; } catch { return ''; }
}

function faviconUrl(hostname: string): string {
  return `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
}

// ── Sorting ────────────────────────────────────────────────────────────────────

function applySorting(items: BmNode[], mode: BookmarkSortMode): BmNode[] {
  if (mode === 'original') return items;
  const byTitle = (a: BmNode, b: BmNode) =>
    (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });
  if (mode === 'alphabetical') return [...items].sort(byTitle);
  // foldersFirst: folders A-Z, then bookmarks in original database order
  const folders   = items.filter(n => !n.url).sort(byTitle);
  const bookmarks = items.filter(n =>  n.url);
  return [...folders, ...bookmarks];
}

// ── Folder picker (settings only) ─────────────────────────────────────────────

function findAncestorIds(nodes: BmNode[], targetId: string): Set<string> {
  const result = new Set<string>();
  function walk(node: BmNode): boolean {
    if (node.id === targetId) return true;
    for (const child of node.children ?? []) {
      if (walk(child)) { result.add(node.id); return true; }
    }
    return false;
  }
  for (const node of nodes) walk(node);
  return result;
}

interface FolderPickerNodeProps {
  node:        BmNode;
  selectedId:  string;
  onSelect:    (id: string, title: string) => void;
  depth:       number;
  expandedIds: Set<string>;
}

function FolderPickerNode({ node, selectedId, onSelect, depth, expandedIds }: FolderPickerNodeProps) {
  const [open, setOpen] = useState(() => (expandedIds ?? new Set<string>()).has(node.id));
  const subFolders = node.children?.filter(c => !c.url) ?? [];

  if (!node.id) {
    return (
      <>
        {subFolders.map(f => (
          <FolderPickerNode key={f.id} node={f} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} expandedIds={expandedIds} />
        ))}
      </>
    );
  }

  return (
    <div className="sg-bf-fp-node" style={{ paddingLeft: depth > 0 ? depth * 6 : 0 }}>
      <div
        className={`sg-bf-fp-row${selectedId === node.id ? ' sg-bf-fp-row--selected' : ''}`}
        onClick={() => onSelect(node.id, node.title)}
      >
        <span
          className="sg-bf-fp-arrow"
          onClick={e => { e.stopPropagation(); if (subFolders.length > 0) setOpen(o => !o); }}
        >
          {subFolders.length > 0 && (
            <span className="sg-bf-fp-toggle">{open ? '▾' : '▸'}</span>
          )}
        </span>
        <span className="sg-bf-fp-icon">📁</span>
        <span className="sg-bf-fp-name">{node.title || '(Root)'}</span>
      </div>
      {open && subFolders.map(f => (
        <FolderPickerNode key={f.id} node={f} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} expandedIds={expandedIds ?? new Set()} />
      ))}
    </div>
  );
}

// ── Settings ───────────────────────────────────────────────────────────────────

interface SettingsProps {
  data:         BookmarkFolderData;
  onUpdateData: (patch: Partial<BookmarkFolderData>) => void;
}

export function BookmarkFolderSettings({ data, onUpdateData }: SettingsProps) {
  const bookmarks = useBookmarkFolder();
  const [tree, setTree]               = useState<BmNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    bookmarks.getTree().then(t => {
      setTree(t);
      setTreeLoading(false);
      const topLevel = t[0]?.children ?? [];
      setExpandedIds(findAncestorIds(topLevel, selectedId));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedId = data.rootFolderId ?? '1';

  return (
    <div className="sg-bf-settings" onClick={e => e.stopPropagation()}>
      <SettingsRow label="Show icons">
        <SettingsSwitch checked={data.showIcons} onChange={v => onUpdateData({ showIcons: v })} />
      </SettingsRow>
      <SettingsRow label="Compact mode">
        <SettingsSwitch checked={data.compactMode} onChange={v => onUpdateData({ compactMode: v })} />
      </SettingsRow>
      <SettingsRow label="Sort order">
        <select
          className="sg-bf-sort-select"
          value={data?.sortingMode ?? 'original'}
          onChange={e => onUpdateData({ sortingMode: e.target.value as BookmarkSortMode })}
        >
          <option value="original">Original</option>
          <option value="foldersFirst">Folders first</option>
          <option value="alphabetical">A–Z</option>
        </select>
      </SettingsRow>

      <div className="sg-bf-settings-divider" />

      <span className="sg-bf-settings-label">Root folder</span>
      {bookmarks.isMock && (
        <p className="sg-bf-settings-note">Mock data — real bookmarks available in the extension.</p>
      )}
      {treeLoading ? (
        <p className="sg-bf-settings-note">Loading…</p>
      ) : (
        <div className="sg-bf-fp-tree">
          {tree[0]?.children?.map(n => (
            <FolderPickerNode
              key={n.id}
              node={n}
              selectedId={selectedId}
              onSelect={(id) => onUpdateData({ rootFolderId: id })}
              depth={0}
              expandedIds={expandedIds}
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
  const cls       = `sg-bf-item${compact ? ' sg-bf-item--compact' : ''}${isFolder ? ' sg-bf-item--folder' : ''}`;

  const icon = isFolder ? (
    <span className="sg-bf-item-icon sg-bf-item-icon--folder">📁</span>
  ) : showIcons && favicon && !iconError ? (
    <img
      className="sg-bf-item-icon sg-bf-item-icon--favicon"
      src={favicon}
      alt=""
      onError={() => setIconError(true)}
    />
  ) : (
    <span className="sg-bf-item-icon sg-bf-item-icon--initial">{initial}</span>
  );

  if (isFolder) {
    return (
      <div className={cls} title={node.title} onClick={() => onFolderClick(node)}>
        {icon}
        <span className="sg-bf-item-title">{node.title || '(Unnamed folder)'}</span>
        <span className="sg-bf-item-chevron">›</span>
      </div>
    );
  }

  return (
    <a className={cls} href={node.url} title={node.title}>
      {icon}
      <span className="sg-bf-item-title">{node.title || hostname || node.url}</span>
    </a>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────────

interface NavEntry { id: string; name: string; }

interface Props {
  data:         BookmarkFolderData;
  onUpdateData: (patch: Partial<BookmarkFolderData>) => void;
}

export default function BookmarkFolder({ data, onUpdateData }: Props) {
  const bookmarks    = useBookmarkFolder();
  const rootFolderId = data.rootFolderId ?? '1';

  const [navStack, setNavStack] = useState<NavEntry[]>([]);
  const [rootName, setRootName] = useState('Bookmarks');
  const [items,    setItems]    = useState<BmNode[]>([]);
  const [loading,  setLoading]  = useState(true);

  const currentId = navStack.length > 0 ? navStack[navStack.length - 1].id : rootFolderId;

  // Reset navigation when root folder changes; sync folderTitle so resolveDynamicTitle stays current
  useEffect(() => {
    setNavStack([]);
    bookmarks.getNode(rootFolderId).then(node => {
      const folderName = node?.title || 'Bookmarks';
      setRootName(folderName);
      if (data.folderTitle !== folderName) {
        onUpdateData({ folderTitle: folderName });
      }
    });
  }, [rootFolderId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load children for current folder
  useEffect(() => {
    setLoading(true);
    bookmarks.getChildren(currentId)
      .then(children => { setItems(children); setLoading(false); })
      .catch(() => setLoading(false));
  }, [currentId]); // eslint-disable-line react-hooks/exhaustive-deps

  function enterFolder(node: BmNode) {
    setNavStack(prev => [...prev, { id: node.id, name: node.title || '(Folder)' }]);
  }

  function goToBreadcrumb(index: number) {
    setNavStack(prev => prev.slice(0, index));
  }

  const breadcrumbs  = [{ id: rootFolderId, name: rootName }, ...navStack];
  const displayItems = applySorting(items, data?.sortingMode ?? 'original');

  return (
    <div className="sg-bf">
      {/* Header — only shown when navigated into a subfolder */}
      {navStack.length > 0 && (
        <div className="sg-bf-header">
          <div className="sg-bf-breadcrumb">
            {breadcrumbs.map((entry, idx) => (
              <span key={`${entry.id}-${idx}`} className="sg-bf-breadcrumb-item">
                {idx > 0 && <span className="sg-bf-breadcrumb-sep">›</span>}
                <button
                  className={`sg-bf-breadcrumb-btn${idx === breadcrumbs.length - 1 ? ' sg-bf-breadcrumb-btn--current' : ''}`}
                  onClick={() => goToBreadcrumb(idx)}
                >
                  {entry.name}
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="sg-bf-body">
        {loading ? (
          <div className="sg-bf-empty">
            <span className="sg-bf-empty-text">Loading…</span>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="sg-bf-empty">
            <span className="sg-bf-empty-icon">📁</span>
            <span className="sg-bf-empty-text">Folder is empty</span>
          </div>
        ) : (
          <div className="sg-bf-list">
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
