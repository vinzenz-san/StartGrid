import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import BackgroundEditor from '../Background/BackgroundEditor';
import SwatchPicker, { THEME_SWATCHES } from '../shared/SwatchPicker';
import { performFactoryReset, exportBackup, importBackup } from './BackupRestore';
import CustomColorPicker from '../shared/CustomColorPicker';
import { SettingsRow, SettingsSwitch, SegmentedControl, SettingsSlider, ActionButton, DirectionPicker } from '../shared/Form';
import { useTheme, DEFAULTS as THEME_DEFAULTS } from '../../contexts/ThemeContext';
import { useSettings, SETTINGS_DEFAULTS } from '../../contexts/SettingsContext';
import { useBackground } from '../../contexts/BackgroundContext';
import { useEditMode } from '../../contexts/EditModeContext';
import ThemeToggle from '../shared/ThemeToggle';
import { useWidgets } from '../../contexts/WidgetContext';
import { WIDGET_REGISTRY, WIDGET_MENU_TYPES } from '../widgets/registry';
import { findFreePosition } from '../../lib/gridUtils';
import { DEFAULT_BG } from '../../types/background';
import type { DevPanelPosition, Language, SettingsButtonPosition } from '../../contexts/SettingsContext';
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

// col/row placement in a 2×2 grid
const DEV_PANEL_CELLS = [
  { value: 'top-left'    as DevPanelPosition, arrow: '↖', col: 1, row: 1 },
  { value: 'top-right'   as DevPanelPosition, arrow: '↗', col: 2, row: 1 },
  { value: 'bottom-left' as DevPanelPosition, arrow: '↙', col: 1, row: 2 },
  { value: 'bottom-right'as DevPanelPosition, arrow: '↘', col: 2, row: 2 },
];

// ── Collapsible section state (UI-only preference, not synced) ─────────────
type SectionKey = 'background' | 'widgets';
const SECTIONS_STORAGE_KEY = 'sg:ui:sections';

function loadSectionState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(SECTIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

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
    colorScheme, accentColor, language, developerOptionsEnabled, devPanelPosition,
    ignoreGlobalThemeSwap, enableCustomContextMenu, settingsPinned, updateSettings,
  } = useSettings();
  const { config, setConfig } = useBackground();
  const { isEditMode, toggleEditMode } = useEditMode();
  const { widgets, addWidget } = useWidgets();
  const [devConfirmOpen,   setDevConfirmOpen]   = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [pickerOpen,       setPickerOpen]       = useState(false);
  const [addMenuOpen,      setAddMenuOpen]      = useState(false);
  const accentSwatchRef = useRef<HTMLButtonElement>(null);

  const [sections, setSections] = useState<Record<string, boolean>>(loadSectionState);
  const isSectionOpen = (key: SectionKey) => sections[key] ?? false;
  const toggleSection = (key: SectionKey) => {
    setSections(prev => {
      const next = { ...prev, [key]: !(prev[key] ?? false) };
      try { localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

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
    updateSettings({ colorScheme: SETTINGS_DEFAULTS.colorScheme, accentColor: SETTINGS_DEFAULTS.accentColor, ignoreGlobalThemeSwap: SETTINGS_DEFAULTS.ignoreGlobalThemeSwap, enableCustomContextMenu: SETTINGS_DEFAULTS.enableCustomContextMenu });
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
    <div className={`sg-settings-panel sg-settings-panel--${panelSide}${isOpen ? ' sg-settings-panel--open' : ''}`} onClick={e => e.stopPropagation()}>

      {/* ── 1. HEADER ── */}
      <div className="sg-settings-header">
        <div className="sg-settings-header-left">
          <button
            className={`sg-pin-btn${settingsPinned ? ' active' : ''}`}
            onClick={() => updateSettings({ settingsPinned: !settingsPinned })}
            title={settingsPinned ? 'Unpin panel' : 'Pin panel'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 17v5" />
              <path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z" />
            </svg>
          </button>
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
        {!settingsPinned && <button className="sg-settings-close" onClick={onClose} title="Close">✕</button>}
      </div>

      {/* ── Scrollable content ── */}
      <div className="sg-settings-content">

        {/* ══ 2. BACKGROUND ══ */}
        <section className="sg-panel-section">
          <button
            className="sg-section-header"
            onClick={() => toggleSection('background')}
            aria-expanded={isSectionOpen('background')}
          >
            <span className="settings-section-label">Background</span>
            <span className="sg-section-chevron">{isSectionOpen('background') ? '∨' : '›'}</span>
          </button>

          <div className={`sg-section-collapse${isSectionOpen('background') ? ' sg-section-collapse--expanded' : ''}`}>
            <div className="sg-section-collapse-inner sg-section-collapse-inner--gap sg-section-collapse-inner--gap-bg">
              <BackgroundEditor />
            </div>
          </div>
        </section>

        {/* ══ 3. WIDGETS ══ */}
        <hr className="sg-settings-divider" />
        <section className="sg-panel-section">
          <button
            className="sg-section-header"
            onClick={() => toggleSection('widgets')}
            aria-expanded={isSectionOpen('widgets')}
          >
            <span className="settings-section-label">Widgets</span>
            <span className="sg-section-chevron">{isSectionOpen('widgets') ? '∨' : '›'}</span>
          </button>

          <div className={`sg-section-collapse${isSectionOpen('widgets') ? ' sg-section-collapse--expanded' : ''}`}>
            <div className="sg-section-collapse-inner sg-section-collapse-inner--gap">
              {/* Lock / Unlock */}
              <SettingsRow label={isEditMode ? 'Layout unlocked' : 'Layout locked'}>
                <button
                  className={`sg-lock-btn${isEditMode ? ' active' : ''}`}
                  onClick={() => { toggleEditMode(); }}
                  title={isEditMode ? 'Lock layout' : 'Unlock layout'}
                >
                  {isEditMode ? '🔒 Lock' : '🔓 Unlock'}
                </button>
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
              <button className="sg-match-bg-btn" onClick={handleMatchBackground}>
                ⬡ Match Background
              </button>
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
              <SettingsRow label="Widget Context Menus">
                <SettingsSwitch
                  checked={enableCustomContextMenu}
                  onChange={v => updateSettings({ enableCustomContextMenu: v })}
                />
              </SettingsRow>
            </div>
          </div>
        </section>

        {/* ══ 4. SETTINGS ══ */}
        <hr className="sg-settings-divider" />
        <section className="sg-panel-section">
          <div className="settings-section-label">Settings</div>
          <div className="sg-section-body">
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
            <SettingsRow label="Light/Dark Mode">
              <ThemeToggle />
            </SettingsRow>
            <SettingsRow label="Apply to Widgets & Backgrounds">
              <SettingsSwitch
                checked={!ignoreGlobalThemeSwap}
                onChange={v => updateSettings({ ignoreGlobalThemeSwap: !v })}
              />
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
          </div>
        </section>

        {/* ══ 5. DATA MANAGEMENT ══ */}
        <hr className="sg-settings-divider" />
        <section className="sg-panel-section">
          <div className="settings-section-label">Data Management</div>
          <div className="sg-section-body">
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

            <ActionButton variant="danger" cooldownTime={1} onClick={doResetAppearance}>
              Reset Appearance
            </ActionButton>
            <ActionButton variant="danger" cooldownTime={3} onClick={() => setResetConfirmOpen(true)}>
              Factory Reset
            </ActionButton>
          </div>
        </section>

        {/* ══ 6. DEVELOPER OPTIONS ══ */}
        <hr className="sg-settings-divider" />
        <section className="sg-panel-section">
          <div className="settings-section-label">Developer Options</div>
          <div className="sg-section-body">
            <SettingsRow label="Enable Dev Mode">
              <SettingsSwitch
                checked={developerOptionsEnabled}
                onChange={v => { if (v) setDevConfirmOpen(true); else updateSettings({ developerOptionsEnabled: false }); }}
              />
            </SettingsRow>
            <SettingsRow label="Panel Position" style={{ opacity: developerOptionsEnabled ? 1 : 0.4 } as React.CSSProperties}>
              <DirectionPicker
                cells={DEV_PANEL_CELLS}
                value={devPanelPosition}
                onChange={v => updateSettings({ devPanelPosition: v })}
                cols={2}
                rows={2}
                disabled={!developerOptionsEnabled}
              />
            </SettingsRow>
          </div>
        </section>

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

      {resetConfirmOpen && createPortal(
        <div className="sg-dev-confirm-backdrop" onPointerDown={() => setResetConfirmOpen(false)}>
          <div className="sg-dev-confirm-dialog" onPointerDown={e => e.stopPropagation()}>
            <div className="sg-dev-confirm-title">Factory Reset</div>
            <p className="sg-dev-confirm-body">
              Are you sure? All configuration will be permanently deleted and the page will reload.
            </p>
            <div className="sg-dev-confirm-actions">
              <button className="sg-dev-confirm-btn sg-dev-confirm-btn--cancel" onClick={() => setResetConfirmOpen(false)}>
                Cancel
              </button>
              <button className="sg-dev-confirm-btn sg-dev-confirm-btn--confirm" onClick={async () => { setResetConfirmOpen(false); await performFactoryReset(developerOptionsEnabled); }}>
                Delete Everything
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {devConfirmOpen && createPortal(
        <div className="sg-dev-confirm-backdrop" onPointerDown={() => setDevConfirmOpen(false)}>
          <div className="sg-dev-confirm-dialog" onPointerDown={e => e.stopPropagation()}>
            <div className="sg-dev-confirm-title">Enable Developer Options?</div>
            <p className="sg-dev-confirm-body">
              Warning: Enabling developer options will remove safety cooldowns and reset
              protection nets across the application. Proceed with caution.
            </p>
            <div className="sg-dev-confirm-actions">
              <button className="sg-dev-confirm-btn sg-dev-confirm-btn--cancel" onClick={() => setDevConfirmOpen(false)}>
                Cancel
              </button>
              <button className="sg-dev-confirm-btn sg-dev-confirm-btn--confirm" onClick={() => { updateSettings({ developerOptionsEnabled: true }); setDevConfirmOpen(false); }}>
                Enable
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
