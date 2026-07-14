import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import BackgroundEditor from '../Background/BackgroundEditor';
import SwatchPicker from '../shared/SwatchPicker';
import GeneralSettings from './GeneralSettings';
import BackupRestore from './BackupRestore';
import CustomColorPicker from '../shared/CustomColorPicker';
import { SettingsRow, SettingsSwitch, SegmentedControl, SettingsSlider, ActionButton } from '../shared/Form';
import { useTheme, DEFAULTS as THEME_DEFAULTS } from '../../contexts/ThemeContext';
import { useSettings, SETTINGS_DEFAULTS } from '../../contexts/SettingsContext';
import { useBackground } from '../../contexts/BackgroundContext';
import { DEFAULT_BG } from '../../types/background';
import type { ColorScheme } from '../../contexts/SettingsContext';
import './SettingsPanel.css';

export type SettingsTab      = 'general' | 'appearance';
export type AppearanceSubTab = 'background' | 'widgets';

const SCHEME_OPTIONS: { value: ColorScheme; label: string }[] = [
  { value: 'light',  label: 'Light'  },
  { value: 'dark',   label: 'Dark'   },
  { value: 'system', label: 'System' },
];

interface Props {
  onClose:         () => void;
  activeTab:       SettingsTab;
  onTabChange:     (tab: SettingsTab) => void;
  activeSubTab:    AppearanceSubTab;
  onSubTabChange:  (sub: AppearanceSubTab) => void;
}

export default function SettingsPanel({ onClose, activeTab, onTabChange, activeSubTab, onSubTabChange }: Props) {
  const {
    globalColor, globalOpacity, globalDim, globalGradientIntensity,
    setGlobalColor, setGlobalOpacity, setGlobalDim, setGlobalGradientIntensity,
    setGlobalPresetId,
  } = useTheme();
  const { colorScheme, accentColor, developerOptionsEnabled, updateSettings } = useSettings();
  const [devConfirmOpen, setDevConfirmOpen] = useState(false);
  const { setConfig } = useBackground();

  const [pickerOpen, setPickerOpen] = useState(false);
  const accentSwatchRef = useRef<HTMLButtonElement>(null);

  const opacityPct      = Math.round(globalOpacity * 100);
  const transparencyPct = 100 - opacityPct;
  const dimPct          = Math.round(globalDim);

  function doResetAppearance() {
    setConfig(DEFAULT_BG);
    setGlobalColor(THEME_DEFAULTS.globalColor);
    setGlobalOpacity(THEME_DEFAULTS.globalOpacity);
    setGlobalDim(THEME_DEFAULTS.globalDim);
    setGlobalGradientIntensity(THEME_DEFAULTS.globalGradientIntensity);
    setGlobalPresetId(THEME_DEFAULTS.globalPresetId);
    updateSettings({ colorScheme: SETTINGS_DEFAULTS.colorScheme, accentColor: SETTINGS_DEFAULTS.accentColor });
  }

  return (
    <div className="sg-settings-panel" onClick={e => e.stopPropagation()}>
      <div className="sg-settings-header">
        <span className="sg-settings-title">Settings</span>
        <button className="sg-settings-close" onClick={onClose} title="Close">✕</button>
      </div>

      {/* ── Main tabs ── */}
      <div className="sg-settings-tabs">
        <button
          className={`sg-settings-tab${activeTab === 'general' ? ' sg-settings-tab--active' : ''}`}
          onClick={() => onTabChange('general')}
        >General</button>
        <button
          className={`sg-settings-tab${activeTab === 'appearance' ? ' sg-settings-tab--active' : ''}`}
          onClick={() => onTabChange('appearance')}
        >Appearance</button>
      </div>

      {/* ── Appearance: sub-tab pill bar (above scrollable content) ── */}
      {activeTab === 'appearance' && (
        <div className="sg-sub-tabs">
          <button
            className={`sg-sub-tab${activeSubTab === 'background' ? ' active' : ''}`}
            onClick={() => onSubTabChange('background')}
          >Background</button>
          <button
            className={`sg-sub-tab${activeSubTab === 'widgets' ? ' active' : ''}`}
            onClick={() => onSubTabChange('widgets')}
          >Widgets</button>
        </div>
      )}

      <div className="sg-settings-content">

        {/* ══ General tab ══ */}
        {activeTab === 'general' && (
          <>
            <GeneralSettings />

            <hr className="sg-settings-divider" />

            <BackupRestore />

            <hr className="sg-settings-divider" />

            <section className="settings-section" style={{ paddingBottom: 12 }}>
              <div className="settings-section-label">Developer Options</div>
              <SettingsRow label="Enable Developer Options">
                <SettingsSwitch
                  checked={developerOptionsEnabled}
                  onChange={v => { if (v) setDevConfirmOpen(true); else updateSettings({ developerOptionsEnabled: false }); }}
                />
              </SettingsRow>
            </section>

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
          </>
        )}

        {/* ══ Appearance tab ══ */}
        {activeTab === 'appearance' && (
          <>
            {/* 1 — Sub-tab content */}
            {activeSubTab === 'background' && <BackgroundEditor />}

            {activeSubTab === 'widgets' && (
              <div className="sg-settings-widgets">
                <section className="settings-section">
                  <div className="settings-section-label">Presets</div>
                  <SwatchPicker
                    value={globalColor}
                    onChange={(color, presetId) => { setGlobalColor(color); setGlobalPresetId(presetId); }}
                    variant="large"
                  />
                  <SettingsSlider
                    label="Gradient Intensity"
                    value={globalGradientIntensity}
                    onChange={setGlobalGradientIntensity}
                  />
                </section>

                <section className="settings-section">
                  <SettingsSlider
                    label="Global Dimming"
                    value={dimPct}
                    onChange={v => setGlobalDim(v)}
                  />
                </section>

                <section className="settings-section" style={{ paddingBottom: 4 }}>
                  <SettingsSlider
                    label="Global Transparency"
                    value={transparencyPct}
                    onChange={v => setGlobalOpacity((100 - v) / 100)}
                  />
                </section>
              </div>
            )}

            {/* 2 — Accent Color */}
            <hr className="sg-settings-divider" />
            <section className="settings-section">
              <div className="settings-section-label">Accent Color</div>
              <SettingsRow label="Accent Color">
                <div className="sg-accent-controls">
                  <button
                    ref={accentSwatchRef}
                    className="sg-accent-swatch"
                    style={{ background: accentColor }}
                    onClick={() => setPickerOpen(o => !o)}
                    title="Pick accent color"
                  />
                  {accentColor !== SETTINGS_DEFAULTS.accentColor && (
                    <button
                      className="sg-accent-reset"
                      onClick={() => updateSettings({ accentColor: SETTINGS_DEFAULTS.accentColor })}
                      title="Reset to default"
                    >Reset</button>
                  )}
                </div>
              </SettingsRow>
            </section>

            {/* 3 — Theme mode */}
            <hr className="sg-settings-divider" />
            <section className="settings-section" style={{ paddingBottom: 4 }}>
              <div className="settings-section-label">Theme</div>
              <SettingsRow label="Mode">
                <SegmentedControl<ColorScheme>
                  options={SCHEME_OPTIONS}
                  value={colorScheme}
                  onChange={v => updateSettings({ colorScheme: v })}
                />
              </SettingsRow>
            </section>

            {/* 4 — Reset footer */}
            <hr className="sg-settings-divider" />
            <div className="sg-appearance-footer">
              <ActionButton variant="danger" cooldownTime={1} onClick={doResetAppearance}>
                Reset Appearance
              </ActionButton>
            </div>

            {/* Portal-rendered color picker */}
            <CustomColorPicker
              value={accentColor}
              onChange={hex => updateSettings({ accentColor: hex })}
              anchorRef={accentSwatchRef}
              open={pickerOpen}
              onClose={() => setPickerOpen(false)}
            />
          </>
        )}

      </div>
    </div>
  );
}
