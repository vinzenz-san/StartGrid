import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import BackgroundEditor from '../Background/BackgroundEditor';
import SwatchPicker, { THEME_SWATCHES } from '../shared/SwatchPicker';
import BackupRestore, { performFactoryReset } from './BackupRestore';
import CustomColorPicker from '../shared/CustomColorPicker';
import { SettingsRow, SettingsSwitch, SegmentedControl, SettingsSlider, ActionButton } from '../shared/Form';
import { useTheme, DEFAULTS as THEME_DEFAULTS } from '../../contexts/ThemeContext';
import { useSettings, SETTINGS_DEFAULTS } from '../../contexts/SettingsContext';
import { useBackground } from '../../contexts/BackgroundContext';
import { DEFAULT_BG } from '../../types/background';
import type { ColorScheme, DevPanelPosition, Language } from '../../contexts/SettingsContext';
import './SettingsPanel.css';

const APP_NAME = 'Startgrid';

const SCHEME_OPTIONS: { value: ColorScheme; label: string }[] = [
  { value: 'light',  label: 'Light'  },
  { value: 'dark',   label: 'Dark'   },
  { value: 'system', label: 'System' },
];

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'de', label: 'DE' },
];

const PANEL_POSITION_OPTIONS: { value: DevPanelPosition; label: string }[] = [
  { value: 'bottom-left',  label: 'Bottom Left'  },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'top-left',     label: 'Top Left'     },
  { value: 'top-right',    label: 'Top Right'    },
];

interface Props {
  onClose: () => void;
  isOpen:  boolean;
}

export default function SettingsPanel({ onClose, isOpen }: Props) {
  const {
    globalColor, globalOpacity, globalDim, globalGradientIntensity, widgetShadowOpacity,
    setGlobalColor, setGlobalOpacity, setGlobalDim, setGlobalGradientIntensity,
    setWidgetShadowOpacity, setGlobalPresetId,
  } = useTheme();
  const {
    colorScheme, accentColor, language, developerOptionsEnabled, devPanelPosition,
    ignoreGlobalThemeSwap, updateSettings,
  } = useSettings();
  const { config, setConfig } = useBackground();
  const [devConfirmOpen,   setDevConfirmOpen]   = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [pickerOpen,       setPickerOpen]       = useState(false);
  const accentSwatchRef = useRef<HTMLButtonElement>(null);

  const transparencyPct = 100 - Math.round(globalOpacity * 100);
  const isDark          = colorScheme !== 'light';

  function doResetAppearance() {
    setConfig(DEFAULT_BG);
    setGlobalColor(THEME_DEFAULTS.globalColor);
    setGlobalOpacity(THEME_DEFAULTS.globalOpacity);
    setGlobalDim(THEME_DEFAULTS.globalDim);
    setGlobalGradientIntensity(THEME_DEFAULTS.globalGradientIntensity);
    setWidgetShadowOpacity(THEME_DEFAULTS.widgetShadowOpacity);
    setGlobalPresetId(THEME_DEFAULTS.globalPresetId);
    updateSettings({ colorScheme: SETTINGS_DEFAULTS.colorScheme, accentColor: SETTINGS_DEFAULTS.accentColor, ignoreGlobalThemeSwap: SETTINGS_DEFAULTS.ignoreGlobalThemeSwap });
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
    <div className={`sg-settings-panel${isOpen ? ' sg-settings-panel--open' : ''}`} onClick={e => e.stopPropagation()}>

      {/* ── 1. HEADER ── */}
      <div className="sg-settings-header">
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
        <button className="sg-settings-close" onClick={onClose} title="Close">✕</button>
      </div>

      {/* ── Scrollable content ── */}
      <div className="sg-settings-content">

        {/* ══ 2. BACKGROUND ══ */}
        <section className="settings-section" style={{ paddingTop: 14 }}>
          <div className="settings-section-label">Background</div>
        </section>
        <BackgroundEditor />

        {/* ══ 3. WIDGETS ══ */}
        <hr className="sg-settings-divider" />
        <section className="settings-section">
          <div className="settings-section-label">Widgets</div>
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
          <SettingsRow label="Ignore light/dark theme swap">
            <SettingsSwitch
              checked={ignoreGlobalThemeSwap}
              onChange={v => updateSettings({ ignoreGlobalThemeSwap: v })}
            />
          </SettingsRow>
        </section>

        {/* ══ 4. SETTINGS ══ */}
        <hr className="sg-settings-divider" />
        <section className="settings-section">
          <div className="settings-section-label">Settings</div>
          <SettingsRow label="Language">
            <SegmentedControl<Language>
              options={LANGUAGE_OPTIONS}
              value={language}
              onChange={v => updateSettings({ language: v })}
            />
          </SettingsRow>
          <SettingsRow label="Theme">
            <SegmentedControl<ColorScheme>
              options={SCHEME_OPTIONS}
              value={colorScheme}
              onChange={v => updateSettings({ colorScheme: v })}
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
        </section>

        <div className="sg-appearance-footer">
          <ActionButton variant="danger" cooldownTime={1} onClick={doResetAppearance}>
            Reset Appearance
          </ActionButton>
        </div>

        {/* ══ 5. DATA MANAGEMENT ══ */}
        <hr className="sg-settings-divider" />
        <section className="settings-section">
          <div className="settings-section-label">Data Management</div>
        </section>
        <BackupRestore compact />

        {/* ══ 6. DEVELOPER OPTIONS ══ */}
        <hr className="sg-settings-divider" />
        <section className="settings-section" style={{ paddingBottom: 14 }}>
          <div className="settings-section-label">Developer Options</div>
          <SettingsRow label="Enable Dev Mode">
            <SettingsSwitch
              checked={developerOptionsEnabled}
              onChange={v => { if (v) setDevConfirmOpen(true); else updateSettings({ developerOptionsEnabled: false }); }}
            />
          </SettingsRow>
          <SettingsRow
            label="Panel Position"
            style={{ opacity: developerOptionsEnabled ? 1 : 0.4, pointerEvents: developerOptionsEnabled ? 'auto' : 'none' } as React.CSSProperties}
          >
            <select
              className="sg-dev-position-select"
              value={devPanelPosition}
              onChange={e => updateSettings({ devPanelPosition: e.target.value as DevPanelPosition })}
            >
              {PANEL_POSITION_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </SettingsRow>
          <ActionButton variant="danger" cooldownTime={developerOptionsEnabled ? 0 : 3} onClick={() => setResetConfirmOpen(true)}>
            Factory Reset
          </ActionButton>
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
