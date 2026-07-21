import { useRef, useState, useEffect } from 'react';
import { ElementInspector } from './ElementInspector';
import BackgroundEditor from '../Background/BackgroundEditor';
import SwatchPicker from '../shared/SwatchPicker';
import { COLOR_PRESETS } from '../../lib/presets';
import { performFactoryReset, exportBackup, importBackup } from './BackupRestore';
import CustomColorPicker from '../shared/CustomColorPicker';
import ConfirmDialog from '../shared/ConfirmDialog';
import { SettingsRow, SettingsSwitch, SettingsSlider, ActionButton, DirectionPicker, IconButton, Dropdown } from '../shared/Form';
import { PanelSection, PanelSectionList } from './PanelSection';
import { DetailedSettings } from './DetailedSettings';
import { SettingsPanelOpenContext } from '../../contexts/SettingsPanelOpenContext';
import { useTheme, DEFAULTS as THEME_DEFAULTS } from '../../contexts/ThemeContext';
import { useSettings, SETTINGS_DEFAULTS } from '../../contexts/SettingsContext';
import { useBackground } from '../../contexts/BackgroundContext';
import { useEditMode } from '../../contexts/EditModeContext';
import ThemeToggle from '../shared/ThemeToggle';
import { useWidgets } from '../../contexts/WidgetContext';
import { useGridConfig } from '../../contexts/GridConfigContext';
import { useApplyGridConfig } from '../../hooks/useApplyGridConfig';
import { compactWidgets } from '../../lib/gridUtils';
import { DEFAULT_BG } from '../../types/background';
import AddWidgetMenu from '../shared/AddWidgetMenu';
import type { Language, SettingsButtonPosition } from '../../contexts/SettingsContext';
import { DEFAULT_GRID_CONFIG, type GridConfig } from '../../types/grid';
import './SettingsPanel.css';

const APP_NAME = 'Startgrid';

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
];

// col/row placement in a 3×2 grid (left col = left-side, center = centered, right col = right-side)
const SETTINGS_BTN_CELLS = [
  { value: 'top-left'    as SettingsButtonPosition, arrow: '↖', col: 1, row: 1 },
  { value: 'top'         as SettingsButtonPosition, arrow: '↑', col: 2, row: 1 },
  { value: 'top-right'   as SettingsButtonPosition, arrow: '↗', col: 3, row: 1 },
  { value: 'bottom-left' as SettingsButtonPosition, arrow: '↙', col: 1, row: 2 },
  { value: 'bottom'      as SettingsButtonPosition, arrow: '↓', col: 2, row: 2 },
  { value: 'bottom-right'as SettingsButtonPosition, arrow: '↘', col: 3, row: 2 },
];

interface Props {
  onClose: () => void;
  isOpen:  boolean;
  settingsButtonPosition: SettingsButtonPosition;
}

export default function SettingsPanel({ onClose, isOpen, settingsButtonPosition }: Props) {
  const {
    globalColor, globalColorScheme, globalOpacity, globalDim, globalGradientIntensity, widgetShadowOpacity, globalPresetId,
    setGlobalColor, setGlobalOpacity, setGlobalDim, setGlobalGradientIntensity,
    setWidgetShadowOpacity, setGlobalPresetId,
  } = useTheme();
  const {
    colorScheme, accentColor, language, developerOptionsEnabled,
    enableCustomContextMenu, settingsPinned, elementInspectorEnabled, updateSettings, t,
    disableGridGlow, disableWidgetGlow, disableBackgroundBlur,
  } = useSettings();
  const panelRef = useRef<HTMLDivElement>(null);
  const { config, setConfig } = useBackground();
  const { isEditMode, toggleEditMode } = useEditMode();
  const { widgets, updateWidget, replaceAllWidgets } = useWidgets();
  const { gridConfig } = useGridConfig();
  const { applyGridConfig } = useApplyGridConfig();
  const [devConfirmOpen,   setDevConfirmOpen]   = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [pickerOpen,       setPickerOpen]       = useState(false);
  // Draft grid geometry — sliders edit this local copy so dragging doesn't
  // trigger a rescale/repack on every tick; the user commits explicitly via
  // the confirm dialog below.
  const [draftGrid,        setDraftGrid]        = useState<GridConfig>(gridConfig);
  const [gridConfirmOpen,  setGridConfirmOpen]  = useState(false);
  const accentSwatchRef = useRef<HTMLButtonElement>(null);

  // gridConfig starts at DEFAULT_GRID_CONFIG (useStorage's synchronous
  // initial value) and only reflects the real saved config once storage.get()
  // resolves asynchronously — draftGrid's useState above captures whatever
  // gridConfig was AT MOUNT TIME, which is that default, not the eventual
  // real value. Re-sync whenever gridConfig changes (hydration completing,
  // a cross-device sync update, or this panel's own apply/reset) so the
  // sliders always reflect the true current config rather than getting
  // stuck at defaults until manually touched.
  useEffect(() => {
    setDraftGrid(gridConfig);
  }, [gridConfig]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing,   setImporting]   = useState(false);
  const [exporting,   setExporting]   = useState(false);

  async function handleExportClick() {
    setExporting(true);
    try { await exportBackup(); } finally { setExporting(false); }
  }

  function handleImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImporting(true);
    importBackup(file)
      .then(() => { setTimeout(() => window.location.reload(), 50); })
      .catch(err => {
        setImportError(err instanceof Error ? err.message : 'Unknown error.');
        setImporting(false);
      });
    e.target.value = '';
  }

  const gridDraftDirty = draftGrid.columns !== gridConfig.columns
    || draftGrid.cellWidth !== gridConfig.cellWidth
    || draftGrid.cellHeight !== gridConfig.cellHeight
    || draftGrid.gap !== gridConfig.gap;

  const confirmApplyGrid = () => {
    applyGridConfig(draftGrid);
    setGridConfirmOpen(false);
  };

  const handleResetGrid = () => {
    applyGridConfig(DEFAULT_GRID_CONFIG);
    setDraftGrid(DEFAULT_GRID_CONFIG);
  };

  const handleCompactGrid = () => {
    replaceAllWidgets(compactWidgets(widgets, gridConfig.columns));
  };

  const transparencyPct = 100 - Math.round(globalOpacity * 100);
  const isDark          = colorScheme !== 'light';
  const panelSide       = settingsButtonPosition.endsWith('left') ? 'left' : 'right';

  function doResetAppearance() {
    setConfig(DEFAULT_BG);
    setGlobalColor(THEME_DEFAULTS.globalColor, THEME_DEFAULTS.globalColorScheme);
    setGlobalOpacity(THEME_DEFAULTS.globalOpacity);
    setGlobalDim(THEME_DEFAULTS.globalDim);
    setGlobalGradientIntensity(THEME_DEFAULTS.globalGradientIntensity);
    setWidgetShadowOpacity(THEME_DEFAULTS.widgetShadowOpacity);
    setGlobalPresetId(THEME_DEFAULTS.globalPresetId);
    updateSettings({ colorScheme: SETTINGS_DEFAULTS.colorScheme, accentColor: SETTINGS_DEFAULTS.accentColor, enableCustomContextMenu: SETTINGS_DEFAULTS.enableCustomContextMenu });
  }

  function doRevertLocalStyles() {
    widgets.forEach(w => {
      if (w.localColorScheme !== undefined || w.localOverrideEnabled) {
        updateWidget(w.id, { localColorScheme: undefined, localOverrideEnabled: false });
      }
    });
  }

  function handleMatchBackground() {
    switch (config.mode) {
      case 'preset':
        if (COLOR_PRESETS.some(p => p.id === config.value)) setGlobalPresetId(config.value);
        break;
      case 'color':
      case 'gradient': {
        const hex = config.customColor ?? config.value.match(/#[0-9a-f]{6}/i)?.[0] ?? THEME_DEFAULTS.globalColor;
        setGlobalColor(hex, config.customColor ? (config.customColorScheme ?? 'dark') : 'dark');
        setGlobalPresetId(undefined);
        break;
      }
      case 'colourGradient':
        // A 2-color gradient has no single flat hex — button is disabled for this mode.
        break;
      default:
        // Every remaining image-backed provider (custom, online, bing, astronomy,
        // wikimedia, unsplash) shares the same letterboxColor fallback.
        setGlobalColor(config.letterboxColor ?? '#000000', 'dark');
        setGlobalPresetId(undefined);
        break;
    }
  }

  return (
    <div ref={panelRef} className={`sg-settings-panel sg-settings-panel--${panelSide}${isOpen ? ' sg-settings-panel--open' : ''}`} onClick={e => e.stopPropagation()}>
      <ElementInspector active={elementInspectorEnabled && developerOptionsEnabled} />

      {/* ── 1. HEADER ── */}
      <div className="sg-settings-header">
        <div className="sg-settings-header-left">
          <IconButton
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 17v5" />
                <path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z" />
              </svg>
            }
            active={settingsPinned}
            onClick={() => updateSettings({ settingsPinned: !settingsPinned })}
            title={settingsPinned ? t('settings.unpinPanel') : t('settings.pinPanel')}
          />
          <div className="sg-settings-brand">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 2L20.66 7V17L12 22L3.34 17V7L12 2Z"
                fill="var(--accent)"
                fillOpacity="0.2"
                stroke="var(--accent)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M12 7L16.33 9.5V14.5L12 17L7.67 14.5V9.5L12 7Z"
                fill="var(--accent)"
                fillOpacity="0.5"
              />
            </svg>
            <span className="sg-settings-title">{APP_NAME}</span>
          </div>
        </div>
        {!settingsPinned && (
          <IconButton icon="✕" onClick={onClose} title={t('settings.close')} />
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div className="sg-settings-content">
        {/* SettingsPanel never unmounts (only slides via CSS transform), so
            <DetailedSettings> reads this to reset itself back to closed on
            every reopen — see SettingsPanelOpenContext for why this doesn't
            remount (and re-hydrate from storage) the PanelSections below. */}
        <SettingsPanelOpenContext.Provider value={isOpen}>
        <PanelSectionList>

          {/* ══ 2. BACKGROUND ══ */}
          <div
            onMouseEnter={() => { if (!disableBackgroundBlur) document.documentElement.classList.add('sg-blur-all-widgets'); }}
            onMouseLeave={() => document.documentElement.classList.remove('sg-blur-all-widgets')}
          >
          <PanelSection title={t('background.sectionTitle')} collapsible persistenceKey="background" collapseGap="spacious">
            <BackgroundEditor />
          </PanelSection>
          </div>

          {/* ══ 3. WIDGETS ══ */}
          <div
            onMouseEnter={() => { if (!disableWidgetGlow) document.documentElement.classList.add('sg-glow-all-widgets'); }}
            onMouseLeave={() => document.documentElement.classList.remove('sg-glow-all-widgets')}
          >
          <PanelSection title={t('widgets.sectionTitle')} collapsible persistenceKey="widgets">
            {/* Lock / Unlock */}
            <SettingsRow label={isEditMode ? t('widgets.layoutUnlocked') : t('widgets.layoutLocked')}>
              <ActionButton variant="ghost" active={isEditMode} fullWidth={false} onClick={toggleEditMode}>
                {isEditMode ? t('widgets.lock') : t('widgets.unlock')}
              </ActionButton>
            </SettingsRow>

            {/* Add Widget */}
            <AddWidgetMenu />

            <SwatchPicker
              isDark={isDark}
              presetId={globalPresetId}
              customColor={globalColor}
              customColorScheme={globalColorScheme}
              onSelectPreset={id => setGlobalPresetId(id)}
              onSelectCustom={(hex, scheme) => { setGlobalColor(hex, scheme); setGlobalPresetId(undefined); }}
              variant="large"
            />
            <ActionButton variant="ghost" onClick={handleMatchBackground} disabled={config.mode === 'colourGradient'}>
              {t('widgets.matchBackground')}
            </ActionButton>
            <p className="bg-sync-warning">{t('widgets.globalStyleNote')}</p>
            <SettingsRow label={t('widgets.contextMenus')}>
              <SettingsSwitch
                checked={enableCustomContextMenu}
                onChange={v => updateSettings({ enableCustomContextMenu: v })}
              />
            </SettingsRow>
            <DetailedSettings>
              <SettingsSlider
                label={t('widgets.transparency')}
                value={transparencyPct}
                onChange={v => setGlobalOpacity((100 - v) / 100)}
              />
              <SettingsSlider
                label={t('widgets.shadowIntensity')}
                value={widgetShadowOpacity}
                onChange={setWidgetShadowOpacity}
              />
              <SettingsSlider
                label={t('widgets.gradientIntensity')}
                value={globalGradientIntensity}
                onChange={setGlobalGradientIntensity}
              />
              <SettingsSlider
                label={t('widgets.dimming')}
                value={Math.round(globalDim)}
                onChange={v => setGlobalDim(v)}
              />
            </DetailedSettings>
          </PanelSection>
          </div>

          {/* ══ 4. GRID ══ */}
          <div
            onMouseEnter={() => { if (!disableGridGlow) document.documentElement.classList.add('sg-grid-glow-hover'); }}
            onMouseLeave={() => document.documentElement.classList.remove('sg-grid-glow-hover')}
          >
          <PanelSection title={t('grid.sectionTitle')} collapsible persistenceKey="grid">
            <SettingsSlider
              label={t('grid.columns')}
              value={draftGrid.columns}
              onChange={v => setDraftGrid(g => ({ ...g, columns: v }))}
              min={4}
              max={64}
              step={1}
              valueFormatter={v => String(v)}
            />
            {/* Single square-cell control — writes the same value to both
                cellWidth and cellHeight so the grid stays 1:1. The schema
                still carries them as independent fields (see grid.ts) for
                configs saved before this simplification; this slider just
                displays cellWidth as the representative value and, the
                moment it's touched, brings cellHeight into sync with it. */}
            <SettingsSlider
              label={t('grid.cellSize')}
              value={draftGrid.cellWidth}
              onChange={v => setDraftGrid(g => ({ ...g, cellWidth: v, cellHeight: v }))}
              min={10}
              max={200}
              step={5}
              valueFormatter={v => `${v}px`}
            />
            <SettingsSlider
              label={t('grid.gap')}
              value={draftGrid.gap}
              onChange={v => setDraftGrid(g => ({ ...g, gap: v }))}
              min={0}
              max={40}
              step={1}
              valueFormatter={v => `${v}px`}
            />
            <p className="bg-sync-warning">{t('grid.note')}</p>
            <p className="sg-grid-experimental-warning">{t('grid.experimentalWarning')}</p>
            <ActionButton variant="ghost" disabled={!gridDraftDirty} onClick={() => setGridConfirmOpen(true)}>
              {t('grid.apply')}
            </ActionButton>
            <ActionButton variant="danger" onClick={handleResetGrid}>
              {t('grid.reset')}
            </ActionButton>
            <p className="bg-sync-warning">{t('grid.compactGridHint')}</p>
            <ActionButton variant="ghost" onClick={handleCompactGrid}>
              {t('grid.compactGrid')}
            </ActionButton>
          </PanelSection>
          </div>

          {/* ══ 5. SETTINGS ══ */}
          <PanelSection title={t('settings.sectionTitle')} collapsible persistenceKey="settings" defaultOpen>
            <SettingsRow label={t('settings.language')}>
              <Dropdown<Language>
                options={LANGUAGE_OPTIONS}
                value={language}
                onChange={v => updateSettings({ language: v })}
                className="sg-lang-dropdown"
              />
            </SettingsRow>
            <SettingsRow label={t('settings.globalTheme')}>
              <ThemeToggle />
            </SettingsRow>
            <SettingsRow label={t('settings.accentColor')}>
              <button
                ref={accentSwatchRef}
                className="bg-color-swatch"
                style={{ background: accentColor }}
                onClick={() => setPickerOpen(o => !o)}
                title="Pick accent color"
              />
            </SettingsRow>
            <SettingsRow label={t('settings.buttonPosition')}>
              <DirectionPicker
                cells={SETTINGS_BTN_CELLS}
                value={settingsButtonPosition}
                onChange={v => updateSettings({ settingsButtonPosition: v })}
                cols={3}
                rows={2}
              />
            </SettingsRow>

            <SettingsRow label={t('settings.disableGridGlow')}>
              <SettingsSwitch
                checked={disableGridGlow}
                onChange={v => updateSettings({ disableGridGlow: v })}
              />
            </SettingsRow>
            <SettingsRow label={t('settings.disableWidgetGlow')}>
              <SettingsSwitch
                checked={disableWidgetGlow}
                onChange={v => updateSettings({ disableWidgetGlow: v })}
              />
            </SettingsRow>
            <SettingsRow label={t('settings.disableBackgroundBlur')}>
              <SettingsSwitch
                checked={disableBackgroundBlur}
                onChange={v => updateSettings({ disableBackgroundBlur: v })}
              />
            </SettingsRow>

            <div className="sg-data-mgmt-row">
              <button className="sg-action-btn" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                {importing ? t('settings.importing') : t('settings.import')}
              </button>
              <button className="sg-action-btn" onClick={handleExportClick} disabled={exporting}>
                {exporting ? t('settings.exporting') : t('settings.export')}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={handleImportFileChange}
              />
            </div>
            {importError && <p className="sg-backup-error">{importError}</p>}

            <ActionButton variant="danger" cooldownTime={1} onClick={doRevertLocalStyles}>
              {t('settings.resetWidgetStyles')}
            </ActionButton>
            <ActionButton variant="danger" cooldownTime={1} onClick={doResetAppearance}>
              {t('settings.resetAppearance')}
            </ActionButton>
            <ActionButton variant="danger" cooldownTime={3} onClick={() => setResetConfirmOpen(true)}>
              {t('settings.factoryReset')}
            </ActionButton>
          </PanelSection>

          {/* ══ 6. DEVELOPER OPTIONS ══ */}
          <PanelSection title={t('dev.sectionTitle')} collapsible persistenceKey="developerOptions">
            <SettingsRow label={t('dev.enableDevMode')}>
              <SettingsSwitch
                checked={developerOptionsEnabled}
                onChange={v => { if (v) setDevConfirmOpen(true); else updateSettings({ developerOptionsEnabled: false }); }}
              />
            </SettingsRow>
          </PanelSection>

        </PanelSectionList>
        </SettingsPanelOpenContext.Provider>
      </div>

      {/* Portal-rendered accent color picker */}
      <CustomColorPicker
        value={accentColor}
        onChange={hex => updateSettings({ accentColor: hex })}
        anchorRef={accentSwatchRef}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onReset={() => updateSettings({ accentColor: SETTINGS_DEFAULTS.accentColor })}
        isDefault={accentColor === SETTINGS_DEFAULTS.accentColor}
      />

      <ConfirmDialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={async () => { setResetConfirmOpen(false); await performFactoryReset(developerOptionsEnabled); }}
        title={t('settings.factoryReset.title')}
        body={t('settings.factoryReset.body')}
        confirmLabel={t('settings.factoryReset.confirm')}
      />

      <ConfirmDialog
        open={devConfirmOpen}
        onClose={() => setDevConfirmOpen(false)}
        onConfirm={() => { updateSettings({ developerOptionsEnabled: true }); setDevConfirmOpen(false); }}
        title={t('dev.confirm.title')}
        body={t('dev.confirm.body')}
        confirmLabel={t('dev.confirm.confirm')}
      />

      <ConfirmDialog
        open={gridConfirmOpen}
        onClose={() => setGridConfirmOpen(false)}
        onConfirm={confirmApplyGrid}
        title={t('grid.confirm.title')}
        body={t('grid.confirm.body')}
        confirmLabel={t('grid.confirm.confirm')}
      />
    </div>
  );
}
