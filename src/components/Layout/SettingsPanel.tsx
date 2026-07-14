import BackgroundEditor from '../Background/BackgroundEditor';
import SwatchPicker from '../shared/SwatchPicker';
import GeneralSettings from './GeneralSettings';
import BackupRestore from './BackupRestore';
import { useTheme } from '../../contexts/ThemeContext';
import './SettingsPanel.css';

export type SettingsTab = 'background' | 'widgets' | 'general' | 'backup';

interface Props {
  onClose:      () => void;
  activeTab:    SettingsTab;
  onTabChange:  (tab: SettingsTab) => void;
}

export default function SettingsPanel({ onClose, activeTab, onTabChange }: Props) {
  const { globalColor, globalOpacity, globalDim, globalGradientIntensity, setGlobalColor, setGlobalOpacity, setGlobalDim, setGlobalGradientIntensity, setGlobalPresetId } = useTheme();
  const opacityPct      = Math.round(globalOpacity * 100);
  const transparencyPct = 100 - opacityPct;
  const dimPct          = Math.round(globalDim);

  return (
    <div className="sg-settings-panel" onClick={e => e.stopPropagation()}>
      <div className="sg-settings-header">
        <span className="sg-settings-title">Settings</span>
        <button className="sg-settings-close" onClick={onClose} title="Close">✕</button>
      </div>

      <div className="sg-settings-tabs">
        <button
          className={`sg-settings-tab${activeTab === 'background' ? ' sg-settings-tab--active' : ''}`}
          onClick={() => onTabChange('background')}
        >Background</button>
        <button
          className={`sg-settings-tab${activeTab === 'widgets' ? ' sg-settings-tab--active' : ''}`}
          onClick={() => onTabChange('widgets')}
        >Widgets</button>
        <button
          className={`sg-settings-tab${activeTab === 'general' ? ' sg-settings-tab--active' : ''}`}
          onClick={() => onTabChange('general')}
        >General</button>
        <button
          className={`sg-settings-tab${activeTab === 'backup' ? ' sg-settings-tab--active' : ''}`}
          onClick={() => onTabChange('backup')}
        >Backup</button>
      </div>

      <div className="sg-settings-content">
        {activeTab === 'background' && <BackgroundEditor />}

        {activeTab === 'general' && <GeneralSettings />}

        {activeTab === 'backup' && <BackupRestore />}

        {activeTab === 'widgets' && (
          <div className="sg-settings-widgets">
            <section className="settings-section">
              <div className="settings-section-label">Presets</div>
              <SwatchPicker
                value={globalColor}
                onChange={(color, presetId) => { setGlobalColor(color); setGlobalPresetId(presetId); }}
                variant="large"
              />
              <div className="settings-gradient-label">Gradient Intensity</div>
              <div className="settings-slider-row">
                <input
                  type="range" min={0} max={100} step={5}
                  value={globalGradientIntensity}
                  onChange={e => setGlobalGradientIntensity(Number(e.target.value))}
                />
                <span className="settings-slider-val">{globalGradientIntensity}%</span>
              </div>
            </section>

            <section className="settings-section">
              <div className="settings-section-label">Global Dimming</div>
              <div className="settings-slider-row">
                <input
                  type="range" min={0} max={100} value={dimPct}
                  onChange={e => setGlobalDim(Number(e.target.value))}
                />
                <span className="settings-slider-val">{dimPct}%</span>
              </div>
            </section>

            <section className="settings-section" style={{ paddingBottom: 12 }}>
              <div className="settings-section-label">Global Transparency</div>
              <div className="settings-slider-row">
                <input
                  type="range" min={0} max={100} value={transparencyPct}
                  onChange={e => setGlobalOpacity((100 - Number(e.target.value)) / 100)}
                />
                <span className="settings-slider-val">{transparencyPct}%</span>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
