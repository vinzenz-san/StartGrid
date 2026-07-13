import { useState } from 'react';
import BackgroundEditor from '../Background/BackgroundEditor';
import SwatchPicker from '../shared/SwatchPicker';
import { useTheme } from '../../contexts/ThemeContext';
import './SettingsPanel.css';

type Tab = 'background' | 'widgets';

interface Props { onClose: () => void; }

export default function SettingsPanel({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('background');
  const { globalColor, globalOpacity, globalDim, globalGradient, setGlobalColor, setGlobalOpacity, setGlobalDim, setGlobalGradient, setGlobalPresetId } = useTheme();
  const opacityPct = Math.round(globalOpacity * 100);
  const dimPct     = Math.round(globalDim);

  return (
    <div className="sg-settings-panel" onClick={e => e.stopPropagation()}>
      <div className="sg-settings-header">
        <span className="sg-settings-title">Settings</span>
        <button className="sg-settings-close" onClick={onClose} title="Close">✕</button>
      </div>

      <div className="sg-settings-tabs">
        <button
          className={`sg-settings-tab${tab === 'background' ? ' sg-settings-tab--active' : ''}`}
          onClick={() => setTab('background')}
        >Background</button>
        <button
          className={`sg-settings-tab${tab === 'widgets' ? ' sg-settings-tab--active' : ''}`}
          onClick={() => setTab('widgets')}
        >Widgets</button>
      </div>

      <div className="sg-settings-content">
        {tab === 'background' && <BackgroundEditor />}

        {tab === 'widgets' && (
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
              <div className="settings-section-label">Global Opacity</div>
              <div className="settings-slider-row">
                <input
                  type="range" min={0} max={100} value={opacityPct}
                  onChange={e => setGlobalOpacity(Number(e.target.value) / 100)}
                />
                <span className="settings-slider-val">{opacityPct}%</span>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
