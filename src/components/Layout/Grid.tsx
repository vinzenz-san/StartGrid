import { useRef, useState, useEffect } from 'react';
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
import WidgetTour from '../shared/WidgetTour';
import CommandPalette from '../shared/CommandPalette';
import DevPanel, { type DevPanelPos } from '../DevPanel/DevPanel';
import InspectorHistoryPanel from '../DevPanel/InspectorHistoryPanel';
import { ElementInspectorProvider } from '../../contexts/ElementInspectorContext';
import { isExtension } from '../../lib/storage';
import { APP_VERSION } from '../../lib/appVersion';
import './Grid.css';

interface DropTarget { col: number; row: number; w: number; h: number; valid: boolean; }

export default function Grid() {
  const { isEditMode, toggleEditMode } = useEditMode();
  const { widgets, updateWidget, loaded } = useWidgets();
  const { gridConfig } = useGridConfig();
  const {
    developerOptionsEnabled, settingsPinned, elementInspectorEnabled,
    disableGridGlow, widgetTourSeen, widgetTourSeenVersion, t,
    loaded: settingsLoaded,
  } = useSettings();
  const gridRef = useRef<HTMLDivElement>(null);
  const [dropTarget,        setDropTarget]        = useState<DropTarget | null>(null);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [devPanelPos,       setDevPanelPos]       = useState<DevPanelPos | null>(null);
  const [tourOpen,          setTourOpen]          = useState(false);

  // Auto-trigger the widget onboarding tour once widgets have loaded (never
  // flashes open on a dashboard that's still mid-restore). Gating differs by
  // build target:
  //  - Real installed extension: `widgetTourSeen` alone, so it shows exactly
  //    once ever, regardless of later version updates.
  //  - docs/preview demo (same bundle, served as a plain web page — see
  //    sync-preview.js and the `isExtension` runtime check in storage.ts):
  //    gated on `widgetTourSeenVersion` instead, so a returning visitor sees
  //    it again after each release, demoing what's new to repeat visitors.
  //
  // Must also wait on settingsLoaded, not just widgets' own `loaded` — the
  // two live in separate storage.get() calls with no ordering guarantee.
  // Reading widgetTourSeen before its own hydration finishes sees it stuck
  // at SETTINGS_DEFAULTS (false), which re-opened the tour on tabs where
  // widgets happened to hydrate first, even though it had already been seen.
  useEffect(() => {
    if (!loaded || !settingsLoaded) return;
    const shouldShow = isExtension
      ? !widgetTourSeen
      : widgetTourSeenVersion !== APP_VERSION;
    if (shouldShow) openTour();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, settingsLoaded]);

  // Tour entry/exit should always find (and leave) the dashboard in its
  // plain resting state — settings closed, layout locked — regardless of
  // whatever the user had open right before triggering it (first run or a
  // manual replay), and regardless of what the tour itself toggled on
  // mid-flow (it opens Settings and enables edit mode partway through).
  const openTour = () => {
    setSettingsPanelOpen(false);
    if (isEditMode) toggleEditMode();
    setTourOpen(true);
  };
  const closeTour = () => {
    setSettingsPanelOpen(false);
    if (isEditMode) toggleEditMode();
    setTourOpen(false);
  };

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

      {/* ── Bottom control bar ──────────────────────────────────────────
          Two shapes depending on edit mode, not a single always-identical
          cluster:
          - Idle: two small icon-only buttons at the bottom corners — a
            settings gear (left) and a pencil that enters edit mode (right).
          - Editing: those two collapse into one full-width bar spanning the
            bottom edge, adding Add Widget and the theme toggle alongside
            Settings and a "Finish Editing" button. */}
      {isEditMode ? (
        <div className="sg-bottom-bar">
          <AddWidgetMenu className="sg-controls-add-widget" />

          <button
            className={`sg-bottom-bar-btn${settingsPanelOpen ? ' active' : ''}`}
            onPointerDown={e => { e.stopPropagation(); e.preventDefault(); if (!settingsPinned) setSettingsPanelOpen(s => !s); }}
            title={t('dashboard.settings')}
          >
            <GearIcon size={14} />
            <span>{t('dashboard.settings')}</span>
          </button>

          <ThemeToggle />

          <button
            className="sg-bottom-bar-btn active"
            onPointerDown={() => { setSettingsPanelOpen(false); toggleEditMode(); }}
            title={t('dashboard.finishEditing')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>{t('dashboard.finishEditing')}</span>
          </button>
        </div>
      ) : (
        <>
          <button
            className="sg-idle-icon sg-idle-icon--left"
            onPointerDown={e => { e.stopPropagation(); e.preventDefault(); if (!settingsPinned) setSettingsPanelOpen(s => !s); }}
            title={t('dashboard.settings')}
          >
            <GearIcon size={15} />
          </button>
          <button
            className="sg-idle-icon sg-idle-icon--right"
            onPointerDown={() => { setSettingsPanelOpen(false); toggleEditMode(); }}
            title={t('dashboard.editLayout')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          </button>
        </>
      )}

      <SettingsPanel
        onClose={() => setSettingsPanelOpen(false)}
        isOpen={settingsPanelOpen || settingsPinned}
        onReplayTour={openTour}
      />

      <WidgetTour
        open={tourOpen}
        onClose={closeTour}
        onOpenSettings={() => setSettingsPanelOpen(true)}
      />

      <CommandPalette />

      <main
        className={`sg-grid-wrapper${settingsPinned ? ' sg-grid-wrapper--pinned-right' : ''}`}
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
