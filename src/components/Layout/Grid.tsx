import { useRef, useState } from 'react';
import { useEditMode } from '../../contexts/EditModeContext';
import { useWidgets } from '../../contexts/WidgetContext';
import { useGridConfig } from '../../contexts/GridConfigContext';
import { useSettings } from '../../contexts/SettingsContext';
import { dragState } from '../../lib/dragState';
import { isPositionFree } from '../../lib/gridUtils';
import WidgetContainer from '../shared/WidgetContainer';
import AddWidgetMenu from '../shared/AddWidgetMenu';
import ThemeToggle from '../shared/ThemeToggle';
import GearIcon from '../shared/icons/GearIcon';
import SettingsPanel from './SettingsPanel';
import DevPanel, { type DevPanelPos } from '../DevPanel/DevPanel';
import InspectorHistoryPanel from '../DevPanel/InspectorHistoryPanel';
import { ElementInspectorProvider } from '../../contexts/ElementInspectorContext';
import { useBackgroundContrast } from '../../hooks/useBackgroundContrast';
import './Grid.css';

interface DropTarget { col: number; row: number; w: number; h: number; valid: boolean; }

export default function Grid() {
  const { isEditMode, toggleEditMode } = useEditMode();
  const { widgets, updateWidget, loaded } = useWidgets();
  const { gridConfig } = useGridConfig();
  const { developerOptionsEnabled, settingsButtonPosition, settingsPinned, elementInspectorEnabled, disableGridGlow, t } = useSettings();
  const gridRef = useRef<HTMLDivElement>(null);
  const gearBtnRef = useRef<HTMLButtonElement>(null);
  const [dropTarget,        setDropTarget]        = useState<DropTarget | null>(null);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [devPanelPos,       setDevPanelPos]       = useState<DevPanelPos | null>(null);
  const gearDarkVariant = useBackgroundContrast(gearBtnRef);

  // .sg-grid's own padding is var(--gap) / 2 (Grid.css — gap is applied via
  // each widget's own margin rather than the grid `gap` property, so the
  // container's leading padding is only half a gap; see the symmetric-gap
  // inset work in WidgetContainer.css). cellWidth itself isn't needed here:
  // column width is always derived from the container's actual rendered
  // width / columns (responsive), the same way it worked before gridConfig
  // existed — only row height (cellHeight) is a fixed value pulled directly
  // from config.
  const { columns, cellHeight, gap } = gridConfig;

  const cellFromPoint = (clientX: number, clientY: number) => {
    const rect = gridRef.current!.getBoundingClientRect();
    const colW = (rect.width - gap * 2 - gap * (columns - 1)) / columns;
    return {
      col: Math.max(1, Math.floor((clientX - rect.left  - gap / 2) / (colW       + gap)) + 1),
      row: Math.max(1, Math.floor((clientY - rect.top   - gap / 2) / (cellHeight + gap)) + 1),
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const widget = widgets.find(w => w.id === dragState.widgetId);
    if (!widget) return;
    const { col, row } = cellFromPoint(e.clientX, e.clientY);
    const targetCol = Math.max(1, Math.min(columns - widget.w + 1, col - dragState.offCol));
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

  // Total rows the grid container (and its glow overlay, which inherits the
  // same --content-rows custom property — see Grid.css) needs to cover.
  // Outside of editing/dragging, this is strictly the bottom-most occupied
  // widget row — no buffer — so the container snaps snugly to content and
  // never shows an idle empty-scroll tail. While editing (or mid-drag),
  // +5 extra rows are added past whichever is lower, the real content or
  // the live drag-ghost's own row, so there's immediate headroom to move a
  // widget further down without the grid resizing under the user's cursor.
  const widgetsBottomRow = Math.max(0, ...widgets.map(w => w.row + w.h - 1));
  const dragBottomRow    = dropTarget ? dropTarget.row + dropTarget.h - 1 : 0;
  const isDragging       = dropTarget !== null;

  const contentRows = (isEditMode || isDragging)
    ? Math.max(widgetsBottomRow, dragBottomRow) + 5
    : widgetsBottomRow;

  return (
    <ElementInspectorProvider enabled={developerOptionsEnabled && elementInspectorEnabled}>
    <div className={`sg-root${isEditMode ? ' sg-root--edit' : ''}`}>

      {/* Top-centered, edit-mode-only shortcut to the same Add Widget menu
          that lives in the Settings Sidebar — always rendered, opacity/
          pointer-events gated by .sg-root--edit so it fades in/out with the
          rest of edit mode's chrome rather than popping in abruptly. */}
      <AddWidgetMenu className="sg-add-widget-floating" />

      {/* ── Floating control cluster ── */}
      {(() => {
        const side = settingsButtonPosition.endsWith('left')
          ? 'left'
          : settingsButtonPosition.endsWith('right')
            ? 'right'
            : 'center';
        return (
          <div className={`sg-controls sg-controls--${settingsButtonPosition} sg-controls--side-${side}`}>
            {/* Settings gear — always visible anchor */}
            <button
              ref={gearBtnRef}
              className={`sg-btn-control sg-btn-control--settings${settingsPanelOpen ? ' active' : ''}${gearDarkVariant ? ' sg-btn-control--dark-variant' : ''}`}
              onPointerDown={e => { e.stopPropagation(); e.preventDefault(); if (!settingsPinned) setSettingsPanelOpen(s => !s); }}
              title={t('dashboard.settings')}
            >
              <GearIcon size={15} />
            </button>

            {/* Theme toggle — hidden until hover */}
            <div className="sg-controls__reveal sg-controls__reveal--theme">
              <ThemeToggle />
            </div>

            {/* Lock/unlock — hidden until hover. Wrapped like the theme toggle
                (rather than putting the reveal classes on the button itself)
                so the center-alignment variant can give both flanks an
                identical width without resizing the button's own hit-box. */}
            <div className="sg-controls__reveal sg-controls__reveal--lock">
              <button
                className={`sg-btn-control${isEditMode ? ' active' : ''}`}
                onPointerDown={() => { setSettingsPanelOpen(false); toggleEditMode(); }}
                title={isEditMode ? t('dashboard.lockLayout') : t('dashboard.unlockLayout')}
              >
                {isEditMode
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                }
              </button>
            </div>
          </div>
        );
      })()}

      <SettingsPanel
        onClose={() => setSettingsPanelOpen(false)}
        isOpen={settingsPanelOpen || settingsPinned}
        settingsButtonPosition={settingsButtonPosition}
      />

      <main
        className={`sg-grid-wrapper${settingsPinned ? ` sg-grid-wrapper--pinned-${settingsButtonPosition.endsWith('left') ? 'left' : 'right'}` : ''}`}
        onClick={() => { if (!settingsPinned) setSettingsPanelOpen(false); }}
      >
        <div
          ref={gridRef}
          className="sg-grid"
          style={{ '--content-rows': contentRows } as React.CSSProperties}
          onDragOver={isEditMode ? handleDragOver : undefined}
          onDrop={isEditMode ? handleDrop : undefined}
          onDragLeave={isEditMode ? handleDragLeave : undefined}
        >
          {/* Grid glow overlay — glowing lines along cell boundaries. Shown
              while editing (see .sg-root--edit rule in Grid.css) or while
              hovering the Grid settings section (sg-grid-glow-hover class,
              toggled in SettingsPanel.tsx). Not rendered at all when the
              user has disabled the effect, rather than just hidden, since
              this is a persistent preference rather than a transient state.
              The outer .sg-grid-glow-clip's height formula (Grid.css) reads
              --content-rows inherited straight from .sg-grid above (CSS
              custom properties inherit by default) — same row count driving
              .sg-grid's own real height, so the glow never disagrees with
              the container it's laid over. It also clips the inner
              overlay's drop-shadow glow to that exact box so it can never
              bleed past the grid's true left/right/bottom edges. */}
          {!disableGridGlow && (
            <div className="sg-grid-glow-clip">
              <div className="sg-grid-glow-overlay" />
            </div>
          )}
          {loaded && (widgets ?? []).map(widget => <WidgetContainer key={widget.id} widget={widget} />)}
          {isEditMode && dropTarget && (
            <div
              className={`sg-drop-ghost${dropTarget.valid ? '' : ' sg-drop-ghost--invalid'}`}
              style={{ gridColumn: `${dropTarget.col} / span ${dropTarget.w}`, gridRow: `${dropTarget.row} / span ${dropTarget.h}` }}
            />
          )}
        </div>
      </main>

      {developerOptionsEnabled && <DevPanel position={devPanelPos} onPositionChange={setDevPanelPos} />}
      {developerOptionsEnabled && elementInspectorEnabled && devPanelPos && (
        <InspectorHistoryPanel devPanelPos={devPanelPos} />
      )}
    </div>
    </ElementInspectorProvider>
  );
}
