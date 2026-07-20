import { useState, useEffect } from 'react';
import type { BookmarksData as BookmarkFolderData, BookmarkSortMode } from '../../../types/widget';
import { SettingsRow, SegmentedControl, SettingsSwitch, Dropdown } from '../../shared/Form';
import { useBookmarkFolder } from './useBookmarkFolder';
import type { BmNode } from './bookmarks.mock';
import { useSettings } from '../../../contexts/SettingsContext';
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
  const { t } = useSettings();
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
        <span className="sg-bf-fp-name">{node.title || t('widget.bookmarkFolder.rootFallback')}</span>
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
  const { t } = useSettings();
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
      <SettingsRow label={t('widget.quicklinks.iconSize')}>
        <SegmentedControl
          options={[
            { value: 'small',  label: 'S' },
            { value: 'medium', label: 'M' },
            { value: 'large',  label: 'L' },
          ]}
          value={data.iconSize ?? 'medium'}
          onChange={v => onUpdateData({ iconSize: v as BookmarkFolderData['iconSize'] })}
        />
      </SettingsRow>
      <SettingsRow label={t('widget.quicklinks.showTitles')}>
        <SettingsSwitch checked={data.showTitles ?? true} onChange={v => onUpdateData({ showTitles: v })} />
      </SettingsRow>
      <SettingsRow label={t('widget.quicklinks.textSize')}>
        <SegmentedControl
          options={[
            { value: 'S', label: 'S' },
            { value: 'M', label: 'M' },
            { value: 'L', label: 'L' },
          ]}
          value={data.textSize ?? 'M'}
          onChange={v => onUpdateData({ textSize: v as BookmarkFolderData['textSize'] })}
        />
      </SettingsRow>
      <SettingsRow label={t('widget.quicklinks.layout')}>
        <SegmentedControl
          options={[
            { value: 'grid', label: t('widget.quicklinks.layoutGrid') },
            { value: 'list', label: t('widget.quicklinks.layoutList') },
          ]}
          value={data.layout ?? 'list'}
          onChange={v => onUpdateData({ layout: v as BookmarkFolderData['layout'] })}
        />
      </SettingsRow>
      <SettingsRow label={t('widget.quicklinks.alignment')}>
        <Dropdown
          options={[
            { value: 'left',   label: t('widget.quicklinks.align.left') },
            { value: 'center', label: t('widget.quicklinks.align.center') },
            { value: 'right',  label: t('widget.quicklinks.align.right') },
            { value: 'top',    label: t('widget.quicklinks.align.top') },
            { value: 'bottom', label: t('widget.quicklinks.align.bottom') },
          ]}
          value={data.alignment ?? 'left'}
          onChange={v => onUpdateData({ alignment: v as BookmarkFolderData['alignment'] })}
        />
      </SettingsRow>
      <SettingsRow label={t('widget.bookmarkFolder.sortOrder')}>
        <select
          className="sg-bf-sort-select"
          value={data?.sortingMode ?? 'original'}
          onChange={e => onUpdateData({ sortingMode: e.target.value as BookmarkSortMode })}
        >
          <option value="original">{t('widget.bookmarkFolder.sortOriginal')}</option>
          <option value="foldersFirst">{t('widget.bookmarkFolder.sortFoldersFirst')}</option>
          <option value="alphabetical">{t('widget.bookmarkFolder.sortAlphabetical')}</option>
        </select>
      </SettingsRow>

      <div className="sg-bf-settings-divider" />

      <span className="sg-bf-settings-label">{t('widget.bookmarkFolder.rootFolder')}</span>
      {bookmarks.isMock && (
        <p className="sg-bf-settings-note">{t('widget.bookmarkFolder.mockNote')}</p>
      )}
      {treeLoading ? (
        <p className="sg-bf-settings-note">{t('widget.bookmarkFolder.loading')}</p>
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
  iconSize:      'small' | 'medium' | 'large';
  showTitle:     boolean;
  textSize:      'S' | 'M' | 'L';
  onFolderClick: (node: BmNode) => void;
}

function ItemRow({ node, iconSize, showTitle, textSize, onFolderClick }: ItemRowProps) {
  const { t } = useSettings();
  const [iconError, setIconError] = useState(false);
  const isFolder  = !node.url;
  const hostname  = node.url ? hostnameOf(node.url) : '';
  const favicon   = hostname ? faviconUrl(hostname) : null;
  const initial   = (node.title || node.url || '?').charAt(0).toUpperCase();
  const cls       = `sg-bf-item sg-bf-item--${iconSize}${isFolder ? ' sg-bf-item--folder' : ''}`;
  const iconCls   = `sg-bf-item-icon sg-bf-item-icon--${iconSize}`;
  const titleCls  = `sg-bf-item-title sg-bf-text--${textSize.toLowerCase()}`;

  const icon = isFolder ? (
    <span className={iconCls}><span className="sg-bf-icon-emoji">📁</span></span>
  ) : favicon && !iconError ? (
    <span className={`${iconCls} sg-bf-item-icon--favicon`}>
      <img src={favicon} alt="" onError={() => setIconError(true)} />
    </span>
  ) : (
    <span className={`${iconCls} sg-bf-item-icon--initial`}><span className="sg-bf-icon-fallback">{initial}</span></span>
  );

  if (isFolder) {
    return (
      <div className={cls} title={node.title} onClick={() => onFolderClick(node)}>
        {icon}
        {showTitle && <span className={titleCls}>{node.title || t('widget.bookmarkFolder.unnamedFolder')}</span>}
        <span className="sg-bf-item-chevron">›</span>
      </div>
    );
  }

  return (
    <a className={cls} href={node.url} title={node.title}>
      {icon}
      {showTitle && <span className={titleCls}>{node.title || hostname || node.url}</span>}
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
  const { t } = useSettings();
  const bookmarks    = useBookmarkFolder();
  const rootFolderId = data.rootFolderId ?? '1';

  const [navStack, setNavStack] = useState<NavEntry[]>([]);
  const [rootName, setRootName] = useState(t('widget.bookmarkFolder.defaultRootName'));
  const [items,    setItems]    = useState<BmNode[]>([]);
  const [loading,  setLoading]  = useState(true);

  const currentId = navStack.length > 0 ? navStack[navStack.length - 1].id : rootFolderId;

  // Reset navigation when root folder changes; sync folderTitle so resolveDynamicTitle stays current
  useEffect(() => {
    setNavStack([]);
    bookmarks.getNode(rootFolderId).then(node => {
      const folderName = node?.title || t('widget.bookmarkFolder.defaultRootName');
      setRootName(folderName);
      if (data.folderTitle !== folderName) {
        onUpdateData({ folderTitle: folderName });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootFolderId]);

  // Load children for current folder
  useEffect(() => {
    setLoading(true);
    bookmarks.getChildren(currentId)
      .then(children => { setItems(children); setLoading(false); })
      .catch(() => setLoading(false));
  }, [currentId]); // eslint-disable-line react-hooks/exhaustive-deps

  function enterFolder(node: BmNode) {
    setNavStack(prev => [...prev, { id: node.id, name: node.title || t('widget.bookmarkFolder.folderFallback') }]);
  }

  function goToBreadcrumb(index: number) {
    setNavStack(prev => prev.slice(0, index));
  }

  const breadcrumbs  = [{ id: rootFolderId, name: rootName }, ...navStack];
  const displayItems = applySorting(items, data?.sortingMode ?? 'original');
  const iconSize      = data.iconSize ?? 'medium';
  const showTitles    = data.showTitles ?? true;
  const textSize      = data.textSize ?? 'M';
  const alignment     = data.alignment ?? 'left';

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
            <span className="sg-bf-empty-text">{t('widget.bookmarkFolder.loading')}</span>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="sg-bf-empty">
            <span className="sg-bf-empty-icon">📁</span>
            <span className="sg-bf-empty-text">{t('widget.bookmarkFolder.folderEmpty')}</span>
          </div>
        ) : (
          <div className={`sg-bf-list${data.layout === 'grid' ? ' sg-bf-list--grid' : ''} sg-bf-list--align-${alignment}`}>
            {displayItems.map(item => (
              <ItemRow
                key={item.id}
                node={item}
                iconSize={iconSize}
                showTitle={showTitles}
                textSize={textSize}
                onFolderClick={enterFolder}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
