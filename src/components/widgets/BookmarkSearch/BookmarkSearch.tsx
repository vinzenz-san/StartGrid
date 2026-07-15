import { useState, useEffect, useRef } from 'react';
import type { BookmarkSearchData } from '../../../types/widget';
import { SettingsSlider } from '../../shared/Form';
import { useBookmarkExplorer } from '../BookmarkExplorer/useBookmarkExplorer';
import type { BmNode } from '../BookmarkExplorer/bookmarks.mock';
import './BookmarkSearch.css';

// ── Helpers ────────────────────────────────────────────────────────────────────

function hostnameOf(url: string): string {
  try { return new URL(url).hostname; } catch { return ''; }
}

// ── Item row ───────────────────────────────────────────────────────────────────

interface RowProps {
  node:            BmNode;
  onFolderClick:   (node: BmNode) => void;
  onBookmarkClick: (url: string) => void;
}

function BookmarkRow({ node, onFolderClick, onBookmarkClick }: RowProps) {
  const [iconError, setIconError] = useState(false);
  const isFolder = !node.url;
  const hostname = node.url ? hostnameOf(node.url) : '';
  const favicon  = hostname ? `https://icons.duckduckgo.com/ip3/${hostname}.ico` : null;

  const icon = isFolder ? (
    <span className="sg-bks-item-icon">📁</span>
  ) : favicon && !iconError ? (
    <img
      className="sg-bks-item-icon sg-bks-item-icon--favicon"
      src={favicon}
      alt=""
      onError={() => setIconError(true)}
    />
  ) : (
    <span className="sg-bks-item-icon sg-bks-item-icon--initial">
      {(node.title || node.url || '?').charAt(0).toUpperCase()}
    </span>
  );

  if (isFolder) {
    return (
      <div className="sg-bks-item sg-bks-item--folder" onClick={() => onFolderClick(node)}>
        {icon}
        <span className="sg-bks-item-title">{node.title || '(Folder)'}</span>
        <span className="sg-bks-item-chevron">›</span>
      </div>
    );
  }

  return (
    <div className="sg-bks-item" onClick={() => node.url && onBookmarkClick(node.url)}>
      {icon}
      <div className="sg-bks-item-info">
        <span className="sg-bks-item-title">{node.title || hostname}</span>
        {hostname && <span className="sg-bks-item-url">{hostname}</span>}
      </div>
    </div>
  );
}

// ── Settings ───────────────────────────────────────────────────────────────────

interface SettingsProps {
  data:         BookmarkSearchData;
  onUpdateData: (patch: Partial<BookmarkSearchData>) => void;
}

export function BookmarkSearchSettings({ data, onUpdateData }: SettingsProps) {
  return (
    <div className="sg-bks-settings" onClick={e => e.stopPropagation()}>
      <SettingsSlider
        label="Max results"
        min={5} max={30} step={1}
        value={data.maxResults ?? 10}
        onChange={v => onUpdateData({ maxResults: v })}
        valueFormatter={v => String(v)}
      />
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────────

interface NavEntry { id: string; name: string; }

interface Props {
  data:         BookmarkSearchData;
  onUpdateData: (patch: Partial<BookmarkSearchData>) => void;
}

export default function BookmarkSearch({ data }: Props) {
  const bookmarks  = useBookmarkExplorer();
  const maxResults = data.maxResults ?? 10;

  const [query,         setQuery]         = useState('');
  const [searchResults, setSearchResults] = useState<BmNode[]>([]);
  const [folderStack,   setFolderStack]   = useState<NavEntry[]>([]);
  const [folderItems,   setFolderItems]   = useState<BmNode[]>([]);
  const [loading,       setLoading]       = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const isInFolder    = folderStack.length > 0;
  const currentFolder = folderStack[folderStack.length - 1];
  const hasQuery      = query.trim().length > 0;

  // Live search (only in search mode)
  useEffect(() => {
    if (isInFolder) return;
    if (!query.trim()) { setSearchResults([]); setLoading(false); return; }
    setLoading(true);
    bookmarks.search(query.trim()).then(results => {
      setSearchResults(results.slice(0, maxResults));
      setLoading(false);
    });
  }, [query, maxResults]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load folder contents when entering a folder
  useEffect(() => {
    if (!isInFolder) return;
    setLoading(true);
    bookmarks.getChildren(currentFolder.id)
      .then(items => { setFolderItems(items); setLoading(false); })
      .catch(() => setLoading(false));
  }, [folderStack]); // eslint-disable-line react-hooks/exhaustive-deps

  function enterFolder(node: BmNode) {
    setFolderStack(prev => [...prev, { id: node.id, name: node.title || '(Folder)' }]);
  }

  function goBack() {
    setFolderStack(prev => prev.slice(0, -1));
  }

  function openBookmark(url: string) {
    bookmarks.openUrl(url);
  }

  const displayItems = isInFolder ? folderItems : searchResults;

  return (
    <div className="sg-bks">
      {/* Header */}
      <div className="sg-bks-header">
        {isInFolder ? (
          <div className="sg-bks-folder-nav">
            <button className="sg-bks-back" onClick={goBack}>‹</button>
            <span className="sg-bks-folder-name">{currentFolder.name}</span>
          </div>
        ) : (
          <div className="sg-bks-search-row">
            <span className="sg-bks-search-icon">⌕</span>
            <input
              ref={searchRef}
              className="sg-bks-search"
              type="text"
              placeholder="Search bookmarks…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onPointerDown={e => e.stopPropagation()}
            />
            {query && (
              <button
                className="sg-bks-clear"
                onClick={() => { setQuery(''); searchRef.current?.focus(); }}
              >✕</button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="sg-bks-body">
        {loading ? (
          <div className="sg-bks-empty">
            <span className="sg-bks-empty-text">Loading…</span>
          </div>
        ) : !isInFolder && !hasQuery ? (
          <div className="sg-bks-empty">
            <span className="sg-bks-empty-icon">🔍</span>
            <span className="sg-bks-empty-text">Type to search bookmarks</span>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="sg-bks-empty">
            <span className="sg-bks-empty-icon">{isInFolder ? '📁' : '🔍'}</span>
            <span className="sg-bks-empty-text">{isInFolder ? 'Folder is empty' : 'No results'}</span>
          </div>
        ) : (
          <div className="sg-bks-list">
            {displayItems.map(item => (
              <BookmarkRow
                key={item.id}
                node={item}
                onFolderClick={enterFolder}
                onBookmarkClick={openBookmark}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
