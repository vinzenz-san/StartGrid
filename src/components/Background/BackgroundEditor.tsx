import { useRef } from 'react';
import { useBackground } from '../../contexts/BackgroundContext';
import { PRESETS, BackgroundMode } from '../../types/background';
import './BackgroundEditor.css';

const SIZE_LIMIT_MB = 3;

interface Props { onClose: () => void; }

export default function BackgroundEditor({ onClose }: Props) {
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

  return (
    <div className="bg-editor" onClick={e => e.stopPropagation()}>
      <div className="bg-editor-header">
        <span>Background</span>
        <button className="bg-editor-close" onClick={onClose}>✕</button>
      </div>

      {/* Solid color */}
      <section className="bg-section">
        <div className="bg-section-label">Color</div>
        <div className="bg-color-row">
          <input
            type="color"
            className="bg-color-swatch"
            value={config.mode === 'color' ? config.value : '#0f1117'}
            onChange={e => setConfig({ mode: 'color', value: e.target.value })}
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
              onClick={() => setConfig({ mode: 'preset', value: preset.id })}
            >
              <span className="bg-preset-label">{preset.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Custom image */}
      <section className="bg-section">
        <div className="bg-section-label">Custom Image</div>
        {customImageUrl ? (
          <div className="bg-custom-preview">
            <img src={customImageUrl} className="bg-custom-thumb" alt="custom background" />
            <div className="bg-custom-actions">
              <button className="bg-btn" onClick={() => setConfig({ mode: 'custom', value: '' })}>
                Use this
              </button>
              <button className="bg-btn bg-btn--danger" onClick={clearCustomImage}>
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button className="bg-upload-btn" onClick={() => fileRef.current?.click()}>
            ＋ Upload image
            <span className="bg-upload-hint">max {SIZE_LIMIT_MB} MB</span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </section>
    </div>
  );
}
