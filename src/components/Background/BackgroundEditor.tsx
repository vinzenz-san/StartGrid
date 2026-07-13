import { useRef } from 'react';
import { useBackground } from '../../contexts/BackgroundContext';
import { PRESETS, BackgroundMode } from '../../types/background';
import './BackgroundEditor.css';

const SIZE_LIMIT_MB = 5;

export default function BackgroundEditor() {
  const { config, customImageUrl, setConfig, setCustomImage, clearCustomImage } = useBackground();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > SIZE_LIMIT_MB * 1024 * 1024) {
      alert(`Image must be under ${SIZE_LIMIT_MB} MB (got ${(file.size / 1024 / 1024).toFixed(1)} MB).`);
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') setCustomImage(ev.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const isActive = (mode: BackgroundMode, value = '') =>
    config.mode === mode && (value === '' || config.value === value);

  const dimPct = Math.round((config.dimAmount ?? 0) * 100);

  return (
    <div className="bg-editor" onClick={e => e.stopPropagation()}>

      {/* Solid color */}
      <section className="bg-section">
        <div className="bg-section-label">Color</div>
        <div className="bg-color-row">
          <input
            type="color"
            className="bg-color-swatch"
            value={config.mode === 'color' ? config.value : '#0f1117'}
            onChange={e => setConfig({ ...config, mode: 'color', value: e.target.value })}
          />
          <span className="bg-color-hint">
            {config.mode === 'color' ? config.value : 'Pick a color'}
          </span>
        </div>
      </section>

      {/* Presets */}
      <section className="bg-section">
        <div className="bg-section-label">Presets</div>
        <div className="bg-presets">
          {PRESETS.map(preset => (
            <button
              key={preset.id}
              className={`bg-preset-thumb${isActive('preset', preset.id) ? ' active' : ''}`}
              style={{ background: preset.css }}
              title={preset.label}
              onClick={() => setConfig({ ...config, mode: 'preset', value: preset.id })}
            >
              <span className="bg-preset-label">{preset.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Custom image / GIF */}
      <section className="bg-section">
        <div className="bg-section-label">Custom Image / GIF</div>
        {customImageUrl ? (
          <div className="bg-custom-preview">
            <img src={customImageUrl} className="bg-custom-thumb" alt="custom background" />
            <div className="bg-custom-actions">
              <button className="bg-btn" onClick={() => setConfig({ ...config, mode: 'custom', value: '' })}>
                Use this
              </button>
              <button className="bg-btn bg-btn--danger" onClick={clearCustomImage}>
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button className="bg-upload-btn" onClick={() => fileRef.current?.click()}>
            ＋ Upload image or GIF
            <span className="bg-upload-hint">max {SIZE_LIMIT_MB} MB · jpg · png · gif · webp</span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
        <p className="bg-sync-warning">Media does not sync between devices due to browser storage limits.</p>
        {customImageUrl && config.mode === 'custom' && (
          <>
            <div className="bg-scaling-row">
              <span className="bg-scaling-label">Scaling</span>
              <select
                className="bg-scaling-select"
                value={config.scalingMode ?? 'cover'}
                onChange={e => setConfig({ ...config, scalingMode: e.target.value as 'cover' | 'fit' })}
              >
                <option value="cover">Cover (crop to fill)</option>
                <option value="fit">Fit (preserve ratio)</option>
              </select>
            </div>
            {config.scalingMode === 'fit' && (
              <div className="bg-scaling-row">
                <span className="bg-scaling-label">Bar color</span>
                <input
                  type="color"
                  className="bg-color-swatch bg-letterbox-swatch"
                  value={config.letterboxColor ?? '#000000'}
                  onChange={e => setConfig({ ...config, letterboxColor: e.target.value })}
                />
                <span className="bg-color-hint">{config.letterboxColor ?? '#000000'}</span>
              </div>
            )}
          </>
        )}
      </section>

      {/* Dim overlay */}
      <section className="bg-section">
        <div className="bg-section-label">Dim</div>
        <div className="bg-dim-row">
          <input
            type="range"
            className="bg-dim-slider"
            min={0} max={90} step={5}
            value={dimPct}
            onChange={e => setConfig({ ...config, dimAmount: Number(e.target.value) / 100 })}
          />
          <span className="bg-dim-val">{dimPct}%</span>
        </div>
      </section>

    </div>
  );
}
