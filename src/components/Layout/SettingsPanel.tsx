import BackgroundEditor from '../Background/BackgroundEditor';
import SwatchPicker from '../shared/SwatchPicker';
import { useTheme } from '../../contexts/ThemeContext';
import './SettingsPanel.css';

export type SettingsTab = 'background' | 'widgets';

interface Props {
  onClose:      () => void;
  activeTab:    SettingsTab;
  onTabChange:  (tab: SettingsTab) => void;
}

export default function SettingsPanel({ onClose, activeTab, onTabChange }: Props) {
  const { globalColor, globalOpacity, globalDim, globalGradient, setGlobalColor, setGlobalOpacity, setGlobalDim, setGlobalGradient, setGlobalPresetId } = useTheme();
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
      </div>

      <div className="sg-settings-content">
        {activeTab === 'background' && <BackgroundEditor />}

        {activeTab === 'widgets' && (
          <div className="sg-settings-widgets">
            <section className="settings-section">
              <div className="settings-section-label">Presets</div>
              <SwatchPicker
                value={globalColor}
                onChange={(color, presetId) => { setGlobalColor(color); setGlobalPresetId(presetId); }}
                variant="large"
              />
              <div className="settings-gradient-row">
                <span className="settings-gradient-label">Gradient Effect</span>
                <button
                  role="switch"
                  aria-checked={globalGradient}
                  className={`sg-form-switch${globalGradient ? ' sg-form-switch--on' : ''}`}
                  onClick={() => setGlobalGradient(!globalGradient)}
                >
                  <span className="sg-form-switch-thumb" />
                </button>
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
