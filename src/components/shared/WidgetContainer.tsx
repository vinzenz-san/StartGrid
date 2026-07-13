import { useRef, useState } from 'react';
import { useEditMode } from '../../contexts/EditModeContext';
import { useWidgets } from '../../contexts/WidgetContext';
import { dragState } from '../../lib/dragState';
import type { Widget, ClockData, QuicklinksData, BookmarksData, GmailData, CalendarData } from '../../types/widget';
import Clock from '../widgets/Clock/Clock';
import Quicklinks from '../widgets/Quicklinks/Quicklinks';
import Bookmarks from '../widgets/Bookmarks/Bookmarks';
import Gmail from '../widgets/Gmail/Gmail';
import Calendar from '../widgets/Calendar/Calendar';
import WidgetPlaceholder from './WidgetPlaceholder';
import './WidgetContainer.css';

const HAS_SETTINGS: Widget['type'][] = ['clock', 'quicklinks', 'bookmarks', 'gmail', 'calendar'];

const CELL = 120;
const GAP  = 12;

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface Props { widget: Widget; }

export default function WidgetContainer({ widget }: Props) {
  const { isEditMode } = useEditMode();
  const { removeWidget, updateWidget } = useWidgets();
  const elRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resizePreview, setResizePreview] = useState<{ w: number; h: number } | null>(null);

  const displayW = resizePreview?.w ?? widget.w;
  const displayH = resizePreview?.h ?? widget.h;

  // ── Drag to move ──────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    const rect = elRef.current!.getBoundingClientRect();
    dragState.widgetId = widget.id;
    dragState.offCol = Math.max(0, Math.floor((e.clientX - rect.left) / ((rect.width  + GAP) / widget.w)));
    dragState.offRow = Math.max(0, Math.floor((e.clientY - rect.top)  / ((rect.height + GAP) / widget.h)));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', widget.id);
    requestAnimationFrame(() => elRef.current?.classList.add('dragging'));
  };

  const handleDragEnd = () => {
    elRef.current?.classList.remove('dragging');
    dragState.widgetId = '';
  };

  // ── Pointer-drag resize ───────────────────────────────────────────────────

  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = widget.w;
    const startH = widget.h;
    const maxW   = 9 - widget.col;

    const step = CELL + GAP;

    const onMove = (ev: PointerEvent) => {
      const newW = Math.max(1, Math.min(maxW, Math.round((startW * step - GAP + ev.clientX - startX + GAP / 2) / step)));
      const newH = Math.max(1,              Math.round((startH * step - GAP + ev.clientY - startY + GAP / 2) / step));
      setResizePreview({ w: newW, h: newH });
    };

    const onUp = (ev: PointerEvent) => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      const finalW = Math.max(1, Math.min(maxW, Math.round((startW * step - GAP + ev.clientX - startX + GAP / 2) / step)));
      const finalH = Math.max(1,              Math.round((startH * step - GAP + ev.clientY - startY + GAP / 2) / step));
      updateWidget(widget.id, { w: finalW, h: finalH });
      setResizePreview(null);
    };

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
  };

  // ── Data update helper ────────────────────────────────────────────────────

  const handleUpdateData = (patch: Record<string, unknown>) => {
    updateWidget(widget.id, { data: { ...widget.data, ...patch } });
  };

  const hasSettings = HAS_SETTINGS.includes(widget.type);

  // ── Widget surface background ─────────────────────────────────────────────

  const bgStyle = widget.bgColor
    ? { background: hexToRgba(widget.bgColor, widget.bgOpacity ?? 1) }
    : {};

  // ── Widget content ────────────────────────────────────────────────────────

  const widgetContent = (
    <>
      {widget.type === 'clock' && (
        <Clock
          data={widget.data as unknown as ClockData}
          isSettingsOpen={settingsOpen}
          onUpdateData={handleUpdateData}
        />
      )}
      {widget.type === 'quicklinks' && (
        <Quicklinks
          key={`${widget.w}-${widget.h}`}
          data={widget.data as unknown as QuicklinksData}
          isSettingsOpen={settingsOpen}
          onUpdateData={patch => handleUpdateData(patch as Record<string, unknown>)}
        />
      )}
      {widget.type === 'bookmarks' && (
        <Bookmarks
          data={widget.data as unknown as BookmarksData}
          isSettingsOpen={settingsOpen}
          onUpdateData={patch => handleUpdateData(patch as Record<string, unknown>)}
        />
      )}
      {widget.type === 'gmail' && (
        <Gmail
          data={widget.data as unknown as GmailData}
          isSettingsOpen={settingsOpen}
          onUpdateData={patch => handleUpdateData(patch as Record<string, unknown>)}
        />
      )}
      {widget.type === 'calendar' && (
        <Calendar
          data={widget.data as unknown as CalendarData}
          isSettingsOpen={settingsOpen}
          onUpdateData={patch => handleUpdateData(patch as Record<string, unknown>)}
        />
      )}
      {widget.type === 'placeholder' && <WidgetPlaceholder widget={widget} />}
    </>
  );

  const opacityPct = Math.round((widget.bgOpacity ?? 1) * 100);

  return (
    <div
      ref={elRef}
      className={`sg-widget${isEditMode ? ' sg-widget--edit' : ''}`}
      draggable={isEditMode && !resizePreview}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{
        gridColumn: `${widget.col} / span ${displayW}`,
        gridRow:    `${widget.row} / span ${displayH}`,
        ...bgStyle,
      }}
    >
      {/* Gear button */}
      {hasSettings && (
        <button
          className={`sg-widget-gear${settingsOpen ? ' active' : ''}`}
          draggable={false}
          onPointerDown={e => e.stopPropagation()}
          onDragStart={e => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setSettingsOpen(s => !s); }}
          title="Settings"
        >⚙</button>
      )}

      {/* Edit-mode controls bar */}
      {isEditMode && (
        <div className="sg-widget-controls" draggable={false} onDragStart={e => e.stopPropagation()}>
          <span className="sg-widget-size">{displayW}×{displayH}</span>
          <div className="sg-widget-actions">
            <button
              className="sg-widget-action danger"
              onPointerDown={e => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Remove this widget?')) removeWidget(widget.id);
              }}
              title="Remove widget"
            >✕</button>
          </div>
        </div>
      )}

      {/* Body — split layout when settings open to fit appearance bar below */}
      {settingsOpen ? (
        <div className="sg-widget-body sg-widget-body--settings-open">
          <div
            className={[
              'sg-widget-settings-wrap',
              widget.invertText     ? 'sg-invert-text'     : '',
              widget.invertFavicons ? 'sg-invert-favicons' : '',
            ].filter(Boolean).join(' ')}
          >
            {widgetContent}
          </div>
          <div className="sg-widget-appearance">
            <span className="sg-widget-appearance-label">Widget Background</span>
            <div className="sg-widget-appearance-row">
              <input
                type="color"
                value={widget.bgColor ?? '#1a1d2e'}
                onChange={e => updateWidget(widget.id, { bgColor: e.target.value })}
                onPointerDown={e => e.stopPropagation()}
                title="Background color"
              />
              <input
                type="range"
                min={0} max={100}
                value={opacityPct}
                onChange={e => updateWidget(widget.id, { bgOpacity: Number(e.target.value) / 100 })}
                onPointerDown={e => e.stopPropagation()}
                title="Opacity"
              />
              <span className="sg-widget-appearance-val">{opacityPct}%</span>
              {widget.bgColor && (
                <button
                  className="sg-widget-appearance-reset"
                  onClick={() => updateWidget(widget.id, { bgColor: undefined, bgOpacity: undefined })}
                  title="Reset to default"
                >✕</button>
              )}
            </div>
            <div className="sg-widget-appearance-row">
              <button
                className={`sg-widget-appearance-toggle${widget.invertText ? ' active' : ''}`}
                onClick={() => updateWidget(widget.id, { invertText: !widget.invertText })}
                onPointerDown={e => e.stopPropagation()}
                title="Invert text colors"
              >T̲ Text</button>
              <button
                className={`sg-widget-appearance-toggle${widget.invertFavicons ? ' active' : ''}`}
                onClick={() => updateWidget(widget.id, { invertFavicons: !widget.invertFavicons })}
                onPointerDown={e => e.stopPropagation()}
                title="Invert favicon/icon colors"
              >⬡ Icons</button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={[
            'sg-widget-body',
            widget.invertText     ? 'sg-invert-text'     : '',
            widget.invertFavicons ? 'sg-invert-favicons' : '',
          ].filter(Boolean).join(' ')}
        >
          {widgetContent}
        </div>
      )}

      {/* Resize handle */}
      {isEditMode && (
        <div
          className="sg-widget-resize"
          onPointerDown={handleResizeStart}
          draggable={false}
          onDragStart={e => e.stopPropagation()}
          title="Resize"
        />
      )}
    </div>
  );
}
