import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, flip, shift, offset, autoUpdate } from '@floating-ui/react';
import { useEditMode } from '../../contexts/EditModeContext';
import { useWidgets } from '../../contexts/WidgetContext';
import { dragState } from '../../lib/dragState';
import type { Widget } from '../../types/widget';
import { WIDGET_REGISTRY } from '../widgets/registry';
import './WidgetContainer.css';

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

  // ── Registry lookup ───────────────────────────────────────────────────────

  const entry      = WIDGET_REGISTRY[widget.type];
  const hasSettings = entry.renderSettings !== null;

  // ── Floating panel positioning ────────────────────────────────────────────

  const { refs, floatingStyles } = useFloating({
    placement: 'right-start',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const setRef = (node: HTMLDivElement | null) => {
    (elRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    refs.setReference(node);
  };

  // Outside-click to close
  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!elRef.current?.contains(target) && !refs.floating.current?.contains(target))
        setSettingsOpen(false);
    };
    document.addEventListener('pointerdown', handler, { capture: true });
    return () => document.removeEventListener('pointerdown', handler, { capture: true });
  }, [settingsOpen, refs.floating]);

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
    const startX = e.clientX, startY = e.clientY;
    const startW = widget.w, startH = widget.h;
    const maxW = 9 - widget.col;
    const step = CELL + GAP;

    const calc = (ev: PointerEvent) => ({
      w: Math.max(1, Math.min(maxW, Math.round((startW * step - GAP + ev.clientX - startX + GAP / 2) / step))),
      h: Math.max(1,              Math.round((startH * step - GAP + ev.clientY - startY + GAP / 2) / step)),
    });

    const onMove = (ev: PointerEvent) => setResizePreview(calc(ev));
    const onUp   = (ev: PointerEvent) => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      const { w, h } = calc(ev);
      updateWidget(widget.id, { w, h });
      setResizePreview(null);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
  };

  // ── Data update helper ────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUpdateData = (patch: any) => {
    updateWidget(widget.id, { data: { ...widget.data, ...patch } });
  };

  const opacityPct = Math.round((widget.bgOpacity ?? 1) * 100);
  const bgStyle    = widget.bgColor
    ? { background: hexToRgba(widget.bgColor, widget.bgOpacity ?? 1) }
    : {};

  // ── Floating panel (portalled) ────────────────────────────────────────────

  const floatingPanel = settingsOpen && createPortal(
    <div
      ref={refs.setFloating}
      className="sg-widget-float-panel"
      style={floatingStyles}
      onPointerDown={e => e.stopPropagation()}
    >
      <div className="sg-widget-float-header">
        <span className="sg-widget-float-title">Widget Settings</span>
        <button className="sg-widget-float-close" onClick={() => setSettingsOpen(false)} title="Close">✕</button>
      </div>

      {/* Widget-specific settings — resolved from registry */}
      {entry.renderSettings?.(widget.data, handleUpdateData)}

      {/* Appearance section — shared across all widgets */}
      <div className="sg-widget-float-divider" />
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
            type="range" min={0} max={100} value={opacityPct}
            onChange={e => updateWidget(widget.id, { bgOpacity: Number(e.target.value) / 100 })}
            onPointerDown={e => e.stopPropagation()}
            title="Opacity"
          />
          <span className="sg-widget-appearance-val">{opacityPct}%</span>
          {widget.bgColor && (
            <button className="sg-widget-appearance-reset"
              onClick={() => updateWidget(widget.id, { bgColor: undefined, bgOpacity: undefined })}
              title="Reset to default">✕</button>
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
    </div>,
    document.body
  );

  return (
    <>
      <div
        ref={setRef}
        className={[
          'sg-widget',
          isEditMode   ? 'sg-widget--edit'            : '',
          settingsOpen ? 'sg-widget--settings-active' : '',
        ].filter(Boolean).join(' ')}
        draggable={isEditMode && !resizePreview}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{
          gridColumn: `${widget.col} / span ${displayW}`,
          gridRow:    `${widget.row} / span ${displayH}`,
          ...bgStyle,
        }}
      >
        {hasSettings && (
          <button
            className={`sg-widget-gear${settingsOpen ? ' active' : ''}`}
            draggable={false}
            onPointerDown={e => e.stopPropagation()}
            onDragStart={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); setSettingsOpen(s => !s); }}
            title="Widget Settings"
          >⚙</button>
        )}

        {isEditMode && (
          <div className="sg-widget-controls" draggable={false} onDragStart={e => e.stopPropagation()}>
            <span className="sg-widget-size">{displayW}×{displayH}</span>
            <div className="sg-widget-actions">
              <button className="sg-widget-action danger"
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); if (window.confirm('Remove this widget?')) removeWidget(widget.id); }}
                title="Remove widget">✕</button>
            </div>
          </div>
        )}

        <div className={[
          'sg-widget-body',
          widget.invertText     ? 'sg-invert-text'     : '',
          widget.invertFavicons ? 'sg-invert-favicons' : '',
        ].filter(Boolean).join(' ')}>
          {entry.renderComponent(widget.data, handleUpdateData)}
        </div>

        {isEditMode && (
          <div className="sg-widget-resize"
            onPointerDown={handleResizeStart}
            draggable={false}
            onDragStart={e => e.stopPropagation()}
            title="Resize" />
        )}
      </div>

      {floatingPanel}
    </>
  );
}
