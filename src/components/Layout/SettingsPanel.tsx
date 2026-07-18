import { useRef, useState } from 'react';
import { ElementInspector } from './ElementInspector';
import BackgroundEditor from '../Background/BackgroundEditor';
import SwatchPicker, { THEME_SWATCHES } from '../shared/SwatchPicker';
import { performFactoryReset, exportBackup, importBackup } from './BackupRestore';
import CustomColorPicker from '../shared/CustomColorPicker';
import ConfirmDialog from '../shared/ConfirmDialog';
import { SettingsRow, SettingsSwitch, SegmentedControl, SettingsSlider, ActionButton, DirectionPicker, IconButton } from '../shared/Form';
import { PanelSection, PanelSectionList } from './PanelSection';
import { DetailedSettings } from './DetailedSettings';
import { useTheme, DEFAULTS as THEME_DEFAULTS } from '../../contexts/ThemeContext';
import { useSettings, SETTINGS_DEFAULTS } from '../../contexts/SettingsContext';
import { useBackground } from '../../contexts/BackgroundContext';
import { useEditMode } from '../../contexts/EditModeContext';
import ThemeToggle from '../shared/ThemeToggle';
import { useWidgets } from '../../contexts/WidgetContext';
import { WIDGET_REGISTRY, WIDGET_MENU_TYPES } from '../widgets/registry';
import { findFreePosition } from '../../lib/gridUtils';
import { DEFAULT_BG } from '../../types/background';
import type { Language, SettingsButtonPosition } from '../../contexts/SettingsContext';
import type { WidgetType } from '../../types/widget';
import './SettingsPanel.css';

const APP_NAME = 'Startgrid';

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'de', label: 'DE' },
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
    globalColor, globalOpacity, globalDim, globalGradientIntensity, widgetShadowOpacity,
    setGlobalColor, setGlobalOpacity, setGlobalDim, setGlobalGradientIntensity,
    setWidgetShadowOpacity, setGlobalPresetId,
  } = useTheme();
  const {
    colorScheme, accentColor, language, developerOptionsEnabled,
    enableCustomContextMenu, settingsPinned, elementInspectorEnabled, updateSettings,
  } = useSettings();
  const panelRef = useRef<HTMLDivElement>(null);
  const { config, setConfig } = useBackground();
  const { isEditMode, toggleEditMode } = useEditMode();
  const { widgets, addWidget, updateWidget } = useWidgets();
  const [devConfirmOpen,   setDevConfirmOpen]   = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [pickerOpen,       setPickerOpen]       = useState(false);
  const [addMenuOpen,      setAddMenuOpen]      = useState(false);
  const accentSwatchRef = useRef<HTMLButtonElement>(null);

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

  const handleAddWidget = (type: WidgetType) => {
    const { defaultSize, defaultData } = WIDGET_REGISTRY[type];
    const { col, row } = findFreePosition(widgets, defaultSize.w, defaultSize.h);
    addWidget({ type, col, row, w: defaultSize.w, h: defaultSize.h, data: defaultData });
    setAddMenuOpen(false);
  };

  const transparencyPct = 100 - Math.round(globalOpacity * 100);
  const isDark          = colorScheme !== 'light';
  const panelSide       = settingsButtonPosition.endsWith('left') ? 'left' : 'right';

  function doResetAppearance() {
    setConfig(DEFAULT_BG);
    setGlobalColor(THEME_DEFAULTS.globalColor);
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
      case 'preset': {
        const swatch = THEME_SWATCHES.find(s => s.id === config.value);
        if (swatch) {
          setGlobalColor(isDark ? swatch.darkEnd : swatch.lightEnd);
          setGlobalPresetId(config.value);
        }
        break;
      }
      case 'color':
        setGlobalColor(config.value);
        setGlobalPresetId(undefined);
        break;
      case 'gradient':
        setGlobalColor(config.customColor ?? config.value.match(/#[0-9a-f]{6}/i)?.[0] ?? THEME_DEFAULTS.globalColor);
        setGlobalPresetId(undefined);
        break;
      case 'custom':
        setGlobalColor(config.letterboxColor ?? '#000000');
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
            title={settingsPinned ? 'Unpin panel' : 'Pin panel'}
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
          <IconButton icon="✕" onClick={onClose} title="Close" />
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div className="sg-settings-content">
        <hr className="sg-settings-divider" />
        <PanelSectionList>

          {/* ══ 2. BACKGROUND ══ */}
          <PanelSection title="Background" collapsible persistenceKey="background" collapseGap="spacious">
            <BackgroundEditor />
          </PanelSection>

          {/* ══ 3. WIDGETS ══ */}
          <div
            onMouseEnter={() => document.documentElement.classList.add('sg-glow-all-widgets')}
            onMouseLeave={() => document.documentElement.classList.remove('sg-glow-all-widgets')}
          >
          <PanelSection title="Widgets" collapsible persistenceKey="widgets">
            {/* Lock / Unlock */}
            <SettingsRow label={isEditMode ? 'Layout unlocked' : 'Layout locked'}>
              <ActionButton variant="ghost" active={isEditMode} fullWidth={false} onClick={toggleEditMode}>
                {isEditMode ? '🔒 Lock' : '🔓 Unlock'}
              </ActionButton>
            </SettingsRow>

            {/* Add Widget */}
            <div className="sg-widget-add-section">
              <button
                className={`sg-widget-add-toggle${addMenuOpen ? ' active' : ''}`}
                onClick={() => setAddMenuOpen(o => !o)}
              >
                ＋ Add Widget
              </button>
              {addMenuOpen && (
                <div className="sg-widget-add-list">
                  {WIDGET_MENU_TYPES
                    .filter(type => !WIDGET_REGISTRY[type].devOnly || developerOptionsEnabled)
                    .map(type => {
                      const { label, icon } = WIDGET_REGISTRY[type];
                      return (
                        <button key={type} className="sg-widget-add-item" onClick={() => handleAddWidget(type)}>
                          <span className="sg-widget-add-icon">{icon}</span>
                          {label}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>

            <SwatchPicker
              value={globalColor}
              onChange={(color, presetId) => { setGlobalColor(color); setGlobalPresetId(presetId); }}
              variant="large"
            />
            <ActionButton variant="ghost" onClick={handleMatchBackground}>
              ⬡ Match Background
            </ActionButton>
            <DetailedSettings persistenceKey="widgets">
              <SettingsSlider
                label="Transparency"
                value={transparencyPct}
                onChange={v => setGlobalOpacity((100 - v) / 100)}
              />
              <SettingsSlider
                label="Shadow Intensity"
                value={widgetShadowOpacity}
                onChange={setWidgetShadowOpacity}
              />
              <SettingsSlider
                label="Gradient Intensity"
                value={globalGradientIntensity}
                onChange={setGlobalGradientIntensity}
              />
              <SettingsSlider
                label="Dimming"
                value={Math.round(globalDim)}
                onChange={v => setGlobalDim(v)}
              />
              {/* TODO: [Context Menu Bug] disabling this currently blocks the native browser
                  context menu entirely instead of just hiding the custom one — needs fix,
                  not addressed here. */}
              <SettingsRow label="Widget Context Menus">
                <SettingsSwitch
                  checked={enableCustomContextMenu}
                  onChange={v => updateSettings({ enableCustomContextMenu: v })}
                />
              </SettingsRow>
            </DetailedSettings>
          </PanelSection>
          </div>

          {/* ══ 4. SETTINGS ══ */}
          <PanelSection title="Settings" collapsible persistenceKey="settings" defaultOpen>
            <SettingsRow label="Button Position">
              <DirectionPicker
                cells={SETTINGS_BTN_CELLS}
                value={settingsButtonPosition}
                onChange={v => updateSettings({ settingsButtonPosition: v })}
                cols={3}
                rows={2}
              />
            </SettingsRow>
            <SettingsRow label="Language">
              <SegmentedControl<Language>
                options={LANGUAGE_OPTIONS}
                value={language}
                onChange={v => updateSettings({ language: v })}
              />
            </SettingsRow>
            <SettingsRow label="Global Theme">
              <ThemeToggle />
            </SettingsRow>
            <SettingsRow label="Accent Color">
              <button
                ref={accentSwatchRef}
                className="sg-accent-swatch"
                style={{ background: accentColor }}
                onClick={() => setPickerOpen(o => !o)}
                title="Pick accent color"
              />
            </SettingsRow>
          </PanelSection>

          {/* ══ 5. DATA MANAGEMENT ══ */}
          <PanelSection title="Data Management" collapsible persistenceKey="dataManagement" defaultOpen>
            <div className="sg-data-mgmt-row">
              <button className="sg-action-btn" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                {importing ? 'Restoring…' : 'Import'}
              </button>
              <button className="sg-action-btn" onClick={handleExportClick} disabled={exporting}>
                {exporting ? 'Exporting…' : 'Export'}
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
              Revert Local Styles
            </ActionButton>
            <ActionButton variant="danger" cooldownTime={1} onClick={doResetAppearance}>
              Reset Appearance
            </ActionButton>
            <ActionButton variant="danger" cooldownTime={3} onClick={() => setResetConfirmOpen(true)}>
              Factory Reset
            </ActionButton>
          </PanelSection>

          {/* ══ 6. DEVELOPER OPTIONS ══ */}
          <PanelSection title="Developer Options" collapsible persistenceKey="developerOptions">
            <SettingsRow label="Enable Dev Mode">
              <SettingsSwitch
                checked={developerOptionsEnabled}
                onChange={v => { if (v) setDevConfirmOpen(true); else updateSettings({ developerOptionsEnabled: false }); }}
              />
            </SettingsRow>
          </PanelSection>

        </PanelSectionList>
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
        title="Factory Reset"
        body="Are you sure? All configuration will be permanently deleted and the page will reload."
        confirmLabel="Delete Everything"
      />

      <ConfirmDialog
        open={devConfirmOpen}
        onClose={() => setDevConfirmOpen(false)}
        onConfirm={() => { updateSettings({ developerOptionsEnabled: true }); setDevConfirmOpen(false); }}
        title="Enable Developer Options?"
        body="Warning: Enabling developer options will remove safety cooldowns and reset protection nets across the application. Proceed with caution."
        confirmLabel="Enable"
      />
    </div>
  );
}
