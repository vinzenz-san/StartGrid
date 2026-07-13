import { useRef, useState } from 'react';
import { useEditMode } from '../../contexts/EditModeContext';
import { useWidgets } from '../../contexts/WidgetContext';
import { dragState } from '../../lib/dragState';
import { findFreePosition, isPositionFree } from '../../lib/gridUtils';
import type { WidgetType } from '../../types/widget';
import { WIDGET_REGISTRY, WIDGET_MENU_TYPES } from '../widgets/registry';
import WidgetContainer from '../shared/WidgetContainer';
import SettingsPanel from './SettingsPanel';
import './Grid.css';

const COLS    = 8;
const GAP     = 12;
const CELL_H  = 120;
const PADDING = 12;

interface DropTarget { col: number; row: number; w: number; h: number; valid: boolean; }

export default function Grid() {
  const { isEditMode, toggleEditMode } = useEditMode();
  const { widgets, addWidget, updateWidget, loaded } = useWidgets();
  const gridRef = useRef<HTMLDivElement>(null);
  const [dropTarget,        setDropTarget]        = useState<DropTarget | null>(null);
  const [addMenuOpen,       setAddMenuOpen]       = useState(false);
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

  const handleAddWidget = (type: WidgetType) => {
    const { defaultSize, defaultData } = WIDGET_REGISTRY[type];
    const { col, row } = findFreePosition(widgets, defaultSize.w, defaultSize.h);
    addWidget({ type, col, row, w: defaultSize.w, h: defaultSize.h, data: defaultData });
    setAddMenuOpen(false);
  };

  return (
    <div className={`sg-root${isEditMode ? ' sg-root--edit' : ''}`}>
      <header className="sg-toolbar">
        <span className="sg-logo">⬡ StartGrid</span>
        <div className="sg-toolbar-actions">
          {isEditMode && (
            <div className="sg-add-wrap">
              <button
                className={`sg-btn-add${addMenuOpen ? ' active' : ''}`}
                onPointerDown={e => { e.stopPropagation(); e.preventDefault(); setAddMenuOpen(s => !s); setSettingsPanelOpen(false); }}
              >＋ Widget</button>
              {addMenuOpen && (
                <div className="sg-add-menu">
                  {WIDGET_MENU_TYPES.map(type => {
                    const { label, icon } = WIDGET_REGISTRY[type];
                    return (
                      <button key={type} className="sg-add-item"
                        onPointerDown={e => { e.stopPropagation(); e.preventDefault(); handleAddWidget(type); }}>
                        <span className="sg-add-icon">{icon}</span>
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {isEditMode && <span className="sg-edit-hint">Drag to move</span>}
          <button
            className={`sg-btn-edit${settingsPanelOpen ? ' active' : ''}`}
            onPointerDown={e => { e.stopPropagation(); e.preventDefault(); setSettingsPanelOpen(s => !s); setAddMenuOpen(false); }}
            title="Settings"
          >⚙ Settings</button>
          <button
            className={`sg-btn-edit${isEditMode ? ' active' : ''}`}
            onPointerDown={() => { setAddMenuOpen(false); setSettingsPanelOpen(false); toggleEditMode(); }}
            title="Edit mode (Ctrl+E)"
          >{isEditMode ? '🔒 Lock' : '🔓 Unlock'}</button>
        </div>
      </header>

      {settingsPanelOpen && <SettingsPanel onClose={() => setSettingsPanelOpen(false)} />}

      <main className="sg-grid-wrapper" onClick={() => { setAddMenuOpen(false); setSettingsPanelOpen(false); }}>
        <div
          ref={gridRef}
          className="sg-grid"
          onDragOver={isEditMode ? handleDragOver : undefined}
          onDrop={isEditMode ? handleDrop : undefined}
          onDragLeave={isEditMode ? handleDragLeave : undefined}
        >
          {loaded && widgets.map(widget => <WidgetContainer key={widget.id} widget={widget} />)}
          {isEditMode && dropTarget && (
            <div
              className={`sg-drop-ghost${dropTarget.valid ? '' : ' sg-drop-ghost--invalid'}`}
              style={{ gridColumn: `${dropTarget.col} / span ${dropTarget.w}`, gridRow: `${dropTarget.row} / span ${dropTarget.h}` }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
