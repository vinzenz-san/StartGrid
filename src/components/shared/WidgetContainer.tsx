import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, flip, shift, offset, autoUpdate } from '@floating-ui/react';
import { useEditMode } from '../../contexts/EditModeContext';
import { useWidgets } from '../../contexts/WidgetContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';
import { darkenHex, mixHex, getAdaptiveColor } from '../../lib/colorUtils';
import { COLOR_PRESETS } from '../../lib/presets';
import { dragState } from '../../lib/dragState';
import type { Widget } from '../../types/widget';
import { WIDGET_REGISTRY, WIDGET_TYPE_LABEL_KEYS } from '../widgets/registry';
import { SettingsSlider } from './Form';
import { SettingsRow, SettingsSwitch } from './Form';
import SwatchPicker from './SwatchPicker';
import ThemeToggle from './ThemeToggle';
import './WidgetContainer.css';

const CELL = 120;
const GAP  = 12;

interface Props { widget: Widget; }

export default function WidgetContainer({ widget }: Props) {
  const { isEditMode } = useEditMode();
  const { removeWidget, updateWidget } = useWidgets();
  const { globalColor, globalColorScheme, globalOpacity, globalDim, globalGradientIntensity, globalPresetId, widgetShadowOpacity } = useTheme();
  const { colorScheme, enableCustomContextMenu, t } = useSettings();
  const elRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resizePreview, setResizePreview] = useState<{ w: number; h: number } | null>(null);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  const displayW = resizePreview?.w ?? widget.w;
  const displayH = resizePreview?.h ?? widget.h;

  // ── Registry lookup ───────────────────────────────────────────────────────

  const entry = WIDGET_REGISTRY[widget.type];

  // ── Orphan guard — unknown / removed widget type ──────────────────────────
  if (!entry) {
    return (
      <div
        className="sg-widget sg-widget--orphan"
        style={{
          gridColumn: `${widget.col} / span ${widget.w}`,
          gridRow:    `${widget.row} / span ${widget.h}`,
        }}
      >
        <div className="sg-widget-orphan-body">
          <span className="sg-widget-orphan-icon">⚠</span>
          <span className="sg-widget-orphan-title">Missing Widget</span>
          <span className="sg-widget-orphan-type">&ldquo;{widget.type}&rdquo; could not be loaded</span>
          <span className="sg-widget-orphan-desc">This safe fallback preserves your layout slot. Remove it or restore the widget type.</span>
          <button
            className="sg-widget-orphan-remove"
            onClick={() => removeWidget(widget.id)}
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  const hasSettings = entry.renderSettings !== null;

  // ── Title / header ────────────────────────────────────────────────────────

  const showCustomTitle = widget.showCustomTitle ?? entry.defaultShowCustomTitle ?? false;
  const showHeader      = entry.titleBehavior === 'optional' && showCustomTitle;
  const titlePlaceholder = entry.resolveDynamicTitle?.(widget.data) ?? entry.defaultTitle ?? t(WIDGET_TYPE_LABEL_KEYS[widget.type]);
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

  // Outside-click to close — ignore clicks inside any active color picker portal
  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Element;
      if (target.closest('.ccp-panel')) return;
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

  // ── Custom context menu ───────────────────────────────────────────────────

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableCustomContextMenu) return;
    e.preventDefault();
    e.stopPropagation();
    setSettingsOpen(true);
  };

  // ── Data update helper ────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUpdateData = (patch: any) => {
    updateWidget(widget.id, { data: { ...widget.data, ...patch } });
  };

  const overrideEnabled      = widget.localOverrideEnabled ?? false;
  const localOpacityPct      = Math.round((widget.bgOpacity ?? globalOpacity) * 100);
  const localTransparencyPct = 100 - localOpacityPct;
  const localDimPct          = Math.round(widget.bgDim ?? globalDim);
  const localShadowPct       = Math.round(widget.bgShadow ?? widgetShadowOpacity);

  // Effective intensity: per-widget value if set, else backwards-compat from old boolean, else global
  const localIntensity = widget.bgGradientIntensity
    ?? (widget.localGradientOverride === false ? 0 : globalGradientIntensity);

  // 'auto' (unset) follows the live global colorScheme; an explicit choice always wins.
  const widgetIsDark = widget.localColorScheme
    ? widget.localColorScheme !== 'light'
    : colorScheme !== 'light';

  const resolvePresetColor = (presetId: string) => {
    const preset = COLOR_PRESETS.find(p => p.id === presetId);
    if (!preset) return null;
    return !widgetIsDark && preset.lightOverride
      ? preset.lightOverride
      : getAdaptiveColor({ color: preset.master, pickedInDark: true }, widgetIsDark);
  };

  // Local preset > local custom color > global preset > global custom color —
  // one resolved hex regardless of which layer is active, so the blend below
  // (and the SwatchPicker preview) never needs to special-case presets vs colors.
  const effectiveColor =
    (widget.bgPresetId && resolvePresetColor(widget.bgPresetId)) ??
    (widget.bgColor !== undefined
      ? getAdaptiveColor({ color: widget.bgColor, pickedInDark: widget.bgColorScheme !== 'light' }, widgetIsDark)
      : null) ??
    (globalPresetId && resolvePresetColor(globalPresetId)) ??
    getAdaptiveColor({ color: globalColor, pickedInDark: globalColorScheme !== 'light' }, widgetIsDark);

  // Local override: set CSS variables on the element so ::before / ::after pick them up.
  const localOverrideStyle: React.CSSProperties = overrideEnabled
    ? (() => {
        const t = localIntensity / 100;
        const colorEnd = mixHex(effectiveColor, darkenHex(effectiveColor), t);
        return {
          '--widget-bg-opacity':     String(widget.bgOpacity ?? globalOpacity),
          '--widget-dim':            String(widget.bgDim ?? globalDim),
          '--widget-shadow-opacity': String(widget.bgShadow ?? widgetShadowOpacity),
          '--widget-bg-preset-css':  `linear-gradient(135deg, ${effectiveColor} 0%, ${colorEnd} 100%)`,
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
        <span className="sg-widget-float-title">{t('widgets.floatTitle')}</span>
        <button className="sg-widget-float-close" onClick={() => setSettingsOpen(false)} title={t('settings.close')}>✕</button>
      </div>

      {/* Title settings — only for 'optional' behavior */}
      {entry.titleBehavior === 'optional' && (
        <div className="sg-widget-title-section">
          <SettingsRow label={t('widgets.showTitle')}>
            <SettingsSwitch
              checked={showCustomTitle}
              onChange={v => updateWidget(widget.id, { showCustomTitle: v })}
            />
          </SettingsRow>
          <div className="sg-widget-title-input-wrap">
            <input
              className="sg-widget-title-input"
              type="text"
              disabled={!showCustomTitle}
              value={widget.customTitle ?? ''}
              placeholder={titlePlaceholder}
              onChange={e => updateWidget(widget.id, { customTitle: e.target.value || undefined })}
              onPointerDown={e => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Widget-specific settings — resolved from registry */}
      {entry.titleBehavior === 'optional' && entry.renderSettings && (
        <div className="sg-widget-float-divider" />
      )}
      {entry.renderSettings?.(widget.data, handleUpdateData, widget.id)}

      {/* Appearance section — shared across all widgets */}
      <div className="sg-widget-float-divider" />
      <div className="sg-widget-appearance">
        <div className="sg-widget-appearance-row">
          <span className="sg-widget-appearance-label">{t('widgets.localStyle')}</span>
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
            <div className="sg-widget-appearance-section">
              <SettingsRow label={t('widgets.localTheme')}>
                <ThemeToggle
                  isDark={widgetIsDark}
                  onToggle={nextIsDark => updateWidget(widget.id, { localColorScheme: nextIsDark ? 'dark' : 'light' })}
                />
              </SettingsRow>
            </div>

            <div className="sg-widget-appearance-section">
              <span className="sg-widget-appearance-label">{t('widgets.presets')}</span>
              <SwatchPicker
                isDark={widgetIsDark}
                presetId={widget.bgPresetId}
                customColor={widget.bgColor}
                customColorScheme={widget.bgColorScheme}
                onSelectPreset={id => updateWidget(widget.id, { bgPresetId: id, bgColor: undefined, bgColorScheme: undefined })}
                onSelectCustom={(hex, scheme) => updateWidget(widget.id, { bgColor: hex, bgColorScheme: scheme, bgPresetId: undefined })}
              />
              <button
                className="sg-widget-match-global-btn"
                onClick={() => updateWidget(widget.id, {
                  bgColor: globalPresetId ? undefined : globalColor,
                  bgColorScheme: globalPresetId ? undefined : globalColorScheme,
                  bgPresetId: globalPresetId ?? undefined,
                })}
                onPointerDown={e => e.stopPropagation()}
              >
                {t('widgets.matchGlobalColor')}
              </button>
            </div>

            <div className="sg-widget-appearance-section">
              <SettingsSlider
                label={t('widgets.transparency')}
                value={localTransparencyPct}
                onChange={v => updateWidget(widget.id, { bgOpacity: (100 - v) / 100 })}
                onPointerDown={e => e.stopPropagation()}
              />
            </div>

            <div className="sg-widget-appearance-section">
              <SettingsSlider
                label={t('widgets.shadowIntensity')}
                value={localShadowPct}
                onChange={v => updateWidget(widget.id, { bgShadow: v })}
                onPointerDown={e => e.stopPropagation()}
              />
            </div>

            <div className="sg-widget-appearance-section">
              <SettingsSlider
                label={t('widgets.gradientIntensity')}
                value={localIntensity}
                onChange={v => updateWidget(widget.id, { bgGradientIntensity: v })}
                onPointerDown={e => e.stopPropagation()}
              />
            </div>

            <div className="sg-widget-appearance-section">
              <SettingsSlider
                label={t('widgets.dimming')}
                value={localDimPct}
                onChange={v => updateWidget(widget.id, { bgDim: v })}
                onPointerDown={e => e.stopPropagation()}
              />
            </div>

            <div className="sg-widget-appearance-section">
              <button
                className="sg-widget-appearance-reset-all"
                onClick={() => updateWidget(widget.id, {
                  bgColor: undefined,
                  bgColorScheme: undefined,
                  bgPresetId: undefined,
                  bgOpacity: undefined,
                  bgDim: undefined,
                  bgShadow: undefined,
                  bgGradientIntensity: undefined,
                  localColorScheme: undefined,
                })}
                onPointerDown={e => e.stopPropagation()}
              >
                {t('widgets.resetToGlobal')}
              </button>
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
          settingsOpen ? 'sg-widget--glow'             : '',
        ].filter(Boolean).join(' ')}
        data-theme={overrideEnabled ? widget.localColorScheme : undefined}
        draggable={isEditMode && !resizePreview}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onContextMenu={handleContextMenu}
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
            title={t('widgets.floatTitle')}
          >⚙</button>
        )}

        {isEditMode && (
          <div className="sg-widget-controls" draggable={false} onDragStart={e => e.stopPropagation()}>
            <span className="sg-widget-size">{displayW}×{displayH}</span>
            <div className="sg-widget-actions">
              <button className="sg-widget-action danger"
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); setRemoveConfirmOpen(true); }}
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
          {entry.renderComponent(widget.data, handleUpdateData, settingsOpen, widget.id)}
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

      {removeConfirmOpen && createPortal(
        <div className="sg-modal-confirm-backdrop" onPointerDown={() => setRemoveConfirmOpen(false)}>
          <div className="sg-modal-confirm-dialog" onPointerDown={e => e.stopPropagation()}>
            <div className="sg-modal-confirm-title">Remove Widget</div>
            <p className="sg-modal-confirm-body">
              Remove this widget from the dashboard?
            </p>
            <div className="sg-modal-confirm-actions">
              <button className="sg-modal-confirm-btn sg-modal-confirm-btn--cancel" onClick={() => setRemoveConfirmOpen(false)}>
                Cancel
              </button>
              <button className="sg-modal-confirm-btn sg-modal-confirm-btn--confirm" onClick={() => { setRemoveConfirmOpen(false); removeWidget(widget.id); }}>
                Remove
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
