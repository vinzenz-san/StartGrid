import { useRef, useState } from 'react';
import { useEditMode } from '../../contexts/EditModeContext';
import { useWidgets } from '../../contexts/WidgetContext';
import { useSettings } from '../../contexts/SettingsContext';
import { dragState } from '../../lib/dragState';
import { isPositionFree } from '../../lib/gridUtils';
import WidgetContainer from '../shared/WidgetContainer';
import ThemeToggle from '../shared/ThemeToggle';
import SettingsPanel from './SettingsPanel';
import DevPanel from '../DevPanel/DevPanel';
import './Grid.css';

const COLS    = 8;
const GAP     = 12;
const CELL_H  = 120;
const PADDING = 12;

interface DropTarget { col: number; row: number; w: number; h: number; valid: boolean; }

export default function Grid() {
  const { isEditMode, toggleEditMode } = useEditMode();
  const { widgets, updateWidget, loaded } = useWidgets();
  const { developerOptionsEnabled, settingsButtonPosition } = useSettings();
  const gridRef = useRef<HTMLDivElement>(null);
  const [dropTarget,        setDropTarget]        = useState<DropTarget | null>(null);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);

  const cellFromPoint = (clientX: number, clientY: number) => {
    const rect = gridRef.current!.getBoundingClientRect();
    const colW = (rect.width - PADDING * 2 - GAP * (COLS - 1)) / COLS;
    return {
      col: Math.max(1, Math.floor((clientX - rect.left  - PADDING) / (colW   + GAP)) + 1),
      row: Math.max(1, Math.floor((clientY - rect.top   - PADDING) / (CELL_H + GAP)) + 1),
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const widget = widgets.find(w => w.id === dragState.widgetId);
    if (!widget) return;
    const { col, row } = cellFromPoint(e.clientX, e.clientY);
    const targetCol = Math.max(1, Math.min(COLS - widget.w + 1, col - dragState.offCol));
    const targetRow = Math.max(1, row - dragState.offRow);
    const valid = isPositionFree(widgets, widget.id, targetCol, targetRow, widget.w, widget.h);
    e.dataTransfer.dropEffect = valid ? 'move' : 'none';
    setDropTarget({ col: targetCol, row: targetRow, w: widget.w, h: widget.h, valid });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropTarget && dragState.widgetId && dropTarget.valid)
      updateWidget(dragState.widgetId, { col: dropTarget.col, row: dropTarget.row });
    setDropTarget(null);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!gridRef.current?.contains(e.relatedTarget as Node)) setDropTarget(null);
  };

  return (
    <div className={`sg-root${isEditMode ? ' sg-root--edit' : ''}`}>

      {/* ── Floating control cluster ── */}
      {(() => {
        const isRight = !settingsButtonPosition.endsWith('left');
        return (
          <div className={`sg-controls sg-controls--${settingsButtonPosition}${isRight ? ' sg-controls--side-right' : ' sg-controls--side-left'}`}>
            {/* Settings gear — always visible anchor */}
            <button
              className={`sg-btn-control sg-btn-control--settings${settingsPanelOpen ? ' active' : ''}`}
              onPointerDown={e => { e.stopPropagation(); e.preventDefault(); setSettingsPanelOpen(s => !s); }}
              title="Settings"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>

            {/* Theme toggle — hidden until hover */}
            <div className="sg-controls__reveal">
              <ThemeToggle />
            </div>

            {/* Lock/unlock — hidden until hover */}
            <button
              className={`sg-btn-control sg-controls__reveal${isEditMode ? ' active' : ''}`}
              onPointerDown={() => { setSettingsPanelOpen(false); toggleEditMode(); }}
              title={isEditMode ? 'Lock layout (Ctrl+E)' : 'Unlock layout (Ctrl+E)'}
            >
              {isEditMode
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
              }
            </button>
          </div>
        );
      })()}

      <SettingsPanel
        onClose={() => setSettingsPanelOpen(false)}
        isOpen={settingsPanelOpen}
        settingsButtonPosition={settingsButtonPosition}
      />

      <main className="sg-grid-wrapper" onClick={() => setSettingsPanelOpen(false)}>
        <div
          ref={gridRef}
          className="sg-grid"
          onDragOver={isEditMode ? handleDragOver : undefined}
          onDrop={isEditMode ? handleDrop : undefined}
          onDragLeave={isEditMode ? handleDragLeave : undefined}
        >
          {loaded && (widgets ?? []).map(widget => <WidgetContainer key={widget.id} widget={widget} />)}
          {isEditMode && dropTarget && (
            <div
              className={`sg-drop-ghost${dropTarget.valid ? '' : ' sg-drop-ghost--invalid'}`}
              style={{ gridColumn: `${dropTarget.col} / span ${dropTarget.w}`, gridRow: `${dropTarget.row} / span ${dropTarget.h}` }}
            />
          )}
        </div>
      </main>

      {developerOptionsEnabled && <DevPanel />}
    </div>
  );
}
