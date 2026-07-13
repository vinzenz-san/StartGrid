import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, flip, shift, offset, autoUpdate } from '@floating-ui/react';
import { useEditMode } from '../../contexts/EditModeContext';
import { useWidgets } from '../../contexts/WidgetContext';
import { useTheme } from '../../contexts/ThemeContext';
import { darkenHex } from '../../lib/colorUtils';
import { dragState } from '../../lib/dragState';
import type { Widget } from '../../types/widget';
import { WIDGET_REGISTRY } from '../widgets/registry';
import { SettingsRow, SettingsSwitch } from './Form';
import SwatchPicker from './SwatchPicker';
import './WidgetContainer.css';

const CELL = 120;
const GAP  = 12;

interface Props { widget: Widget; }

export default function WidgetContainer({ widget }: Props) {
  const { isEditMode } = useEditMode();
  const { removeWidget, updateWidget } = useWidgets();
  const { globalColor, globalOpacity, globalDim, globalGradient } = useTheme();
  const elRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resizePreview, setResizePreview] = useState<{ w: number; h: number } | null>(null);

  const displayW = resizePreview?.w ?? widget.w;
  const displayH = resizePreview?.h ?? widget.h;

  // ── Registry lookup ───────────────────────────────────────────────────────

  const entry       = WIDGET_REGISTRY[widget.type];
  const hasSettings = entry.renderSettings !== null;

  // ── Title / header ────────────────────────────────────────────────────────

  const showCustomTitle = widget.showCustomTitle ?? entry.defaultShowCustomTitle ?? false;
  const showHeader      = entry.titleBehavior === 'optional' && showCustomTitle;
  const titlePlaceholder = entry.resolveDynamicTitle?.(widget.data) ?? entry.defaultTitle ?? entry.label;
  const resolvedTitle    = widget.customTitle || titlePlaceholder;

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

  const overrideEnabled      = widget.localOverrideEnabled  ?? false;
  const localGradientEnabled = widget.localGradientOverride ?? false;
  const localOpacityPct     = Math.round((widget.bgOpacity ?? globalOpacity) * 100);
  const localDimPct         = Math.round(widget.bgDim ?? globalDim);
  const effectiveColor      = widget.bgColor ?? globalColor;

  // Local override: set CSS variables on the element so ::before / ::after pick them up.
  // --widget-bg-preset-css overrides the `:root` preset (or formula fallback) for this widget only.
  const localOverrideStyle: React.CSSProperties = overrideEnabled
    ? (() => {
        const colorEnd = localGradientEnabled ? darkenHex(effectiveColor) : effectiveColor;
        return {
          '--widget-bg-preset-css': `linear-gradient(135deg, ${effectiveColor}, ${colorEnd})`,
          '--widget-bg-opacity':    String(widget.bgOpacity ?? globalOpacity),
          '--widget-dim':           String(widget.bgDim ?? globalDim),
        } as React.CSSProperties;
      })()
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

      {/* Title settings — only for 'optional' behavior */}
      {entry.titleBehavior === 'optional' && (
        <div className="sg-widget-title-section">
          <SettingsRow label="Show title">
            <SettingsSwitch
              checked={showCustomTitle}
              onChange={v => updateWidget(widget.id, { showCustomTitle: v })}
            />
          </SettingsRow>
          {showCustomTitle && (
            <div className="sg-widget-title-input-wrap">
              <input
                className="sg-widget-title-input"
                type="text"
                value={widget.customTitle ?? ''}
                placeholder={titlePlaceholder}
                onChange={e => updateWidget(widget.id, { customTitle: e.target.value || undefined })}
                onPointerDown={e => e.stopPropagation()}
              />
            </div>
          )}
        </div>
      )}

      {/* Widget-specific settings — resolved from registry */}
      {entry.titleBehavior === 'optional' && entry.renderSettings && (
        <div className="sg-widget-float-divider" />
      )}
      {entry.renderSettings?.(widget.data, handleUpdateData)}

      {/* Appearance section — shared across all widgets */}
      <div className="sg-widget-float-divider" />
      <div className="sg-widget-appearance">
        <div className="sg-widget-appearance-row">
          <span className="sg-widget-appearance-label">Override global style</span>
          <button
            role="switch"
            aria-checked={overrideEnabled}
            className={`sg-form-switch${overrideEnabled ? ' sg-form-switch--on' : ''}`}
            onClick={() => updateWidget(widget.id, { localOverrideEnabled: !overrideEnabled })}
            onPointerDown={e => e.stopPropagation()}
          >
            <span className="sg-form-switch-thumb" />
          </button>
        </div>

        {overrideEnabled && (
          <>
            <div className="sg-widget-appearance-row">
              <span className="sg-widget-appearance-label">Gradient effect</span>
              <button
                role="switch"
                aria-checked={localGradientEnabled}
                className={`sg-form-switch${localGradientEnabled ? ' sg-form-switch--on' : ''}`}
                onClick={() => updateWidget(widget.id, { localGradientOverride: !localGradientEnabled })}
                onPointerDown={e => e.stopPropagation()}
              >
                <span className="sg-form-switch-thumb" />
              </button>
            </div>
            <SwatchPicker
              value={widget.bgColor ?? globalColor}
              onChange={color => updateWidget(widget.id, { bgColor: color })}
            />
            <div className="sg-widget-appearance-row">
              <span className="sg-widget-appearance-label">Dimming</span>
              <input
                type="range" min={0} max={80} value={localDimPct}
                onChange={e => updateWidget(widget.id, { bgDim: Number(e.target.value) })}
                onPointerDown={e => e.stopPropagation()}
                title="Dimming"
              />
              <span className="sg-widget-appearance-val">{localDimPct}%</span>
            </div>
            <div className="sg-widget-appearance-row">
              <span className="sg-widget-appearance-label">Opacity</span>
              <input
                type="range" min={0} max={100} value={localOpacityPct}
                onChange={e => updateWidget(widget.id, { bgOpacity: Number(e.target.value) / 100 })}
                onPointerDown={e => e.stopPropagation()}
                title="Opacity"
              />
              <span className="sg-widget-appearance-val">{localOpacityPct}%</span>
            </div>
          </>
        )}
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
          ...localOverrideStyle,
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

        {showHeader && (
          <header className="sg-widget-header">
            <h3 className="sg-widget-title">{resolvedTitle}</h3>
          </header>
        )}

        <div className="sg-widget-body">
          {entry.renderComponent(widget.data, handleUpdateData, settingsOpen)}
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
