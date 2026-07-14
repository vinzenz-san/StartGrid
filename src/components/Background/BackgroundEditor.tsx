import { useRef, useState } from 'react';
import { useBackground } from '../../contexts/BackgroundContext';
import { PRESETS } from '../../types/background';
import { generateGradient } from '../../lib/colorUtils';
import CustomColorPicker from '../shared/CustomColorPicker';
import './BackgroundEditor.css';

const SIZE_LIMIT_MB = 5;
const RAINBOW_BG = 'linear-gradient(135deg, #6366f1 0%, #ec4899 40%, #f59e0b 70%, #10b981 100%)';

export default function BackgroundEditor() {
  const { config, customImageUrl, setConfig, setCustomImage, clearCustomImage } = useBackground();
  const fileRef          = useRef<HTMLInputElement>(null);
  const customSwatchRef   = useRef<HTMLDivElement>(null);
  const letterboxBtnRef   = useRef<HTMLButtonElement>(null);
  const [dragOver, setDragOver]             = useState(false);
  const [pickerOpen, setPickerOpen]         = useState(false);
  const [lbPickerOpen, setLbPickerOpen]     = useState(false);

  const processFile = (file: File) => {
    if (file.size > SIZE_LIMIT_MB * 1024 * 1024) {
      alert(`Image must be under ${SIZE_LIMIT_MB} MB (got ${(file.size / 1024 / 1024).toFixed(1)} MB).`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') setCustomImage(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) processFile(file);
  };

  const dimPct = Math.round((config.dimAmount ?? 0) * 100);

  const isCustomActive = config.mode === 'color' || config.mode === 'gradient';
  const isPresetActive  = (id: string) => config.mode === 'preset' && config.value === id;

  const intensity = config.gradientIntensity ?? (config.customGradient === false ? 0 : 100);

  const customThumbBg = isCustomActive && config.customColor
    ? generateGradient(config.customColor)
    : RAINBOW_BG;

  // Initial color for the picker: persisted custom color, or first hex from active preset
  const pickerValue = config.customColor
    ?? PRESETS.find(p => p.id === config.value)?.css.match(/#[0-9a-f]{6}/i)?.[0]
    ?? '#6366f1';

  const handleCustomColorPick = (hex: string) => {
    setConfig({
      ...config,
      mode:        'gradient',
      value:       generateGradient(hex),
      customColor: hex,
    });
  };

  return (
    <div className="bg-editor" onClick={e => e.stopPropagation()}>

      {/* Presets + custom swatch */}
      <section className="settings-section">
        <div className="settings-section-label">Presets</div>
        <div className="preset-grid">
          {PRESETS.map(preset => (
            <button
              key={preset.id}
              className={`preset-tile${isPresetActive(preset.id) ? ' active' : ''}`}
              data-preset-id={preset.id}
              onClick={() => setConfig({ ...config, mode: 'preset', value: preset.id })}
            >
              {isPresetActive(preset.id) && <span className="sg-swatch-check-lg">✓</span>}
              <span className="preset-tile-label">{preset.label}</span>
            </button>
          ))}

          {/* Custom swatch — 6th cell */}
          <div
            ref={customSwatchRef}
            className={`preset-tile bg-preset-thumb--custom${isCustomActive ? ' active' : ''}`}
            style={{ background: customThumbBg }}
            onClick={() => setPickerOpen(true)}
          >
            {isCustomActive
              ? <span className="sg-swatch-check-lg">✓</span>
              : <span className="preset-tile-label">Custom</span>
            }
          </div>
        </div>

        {/* Gradient intensity slider — applies to presets; 0 = flat, 100 = full gradient */}
        <div className="settings-gradient-label">Gradient Intensity</div>
        <div className="settings-slider-row">
          <input
            type="range"
            min={0} max={100} step={5}
            value={intensity}
            onChange={e => setConfig({ ...config, gradientIntensity: Number(e.target.value) })}
          />
          <span className="settings-slider-val">{intensity}%</span>
        </div>
      </section>

      {/* Global Dimming */}
      <section className="settings-section">
        <div className="settings-section-label">Global Dimming</div>
        <div className="settings-slider-row">
          <input
            type="range"
            min={0} max={100} step={5}
            value={dimPct}
            onChange={e => setConfig({ ...config, dimAmount: Number(e.target.value) / 100 })}
          />
          <span className="settings-slider-val">{dimPct}%</span>
        </div>
      </section>

      {/* Custom image / GIF */}
      <section className="settings-section" style={{ paddingBottom: 12 }}>
        <div className="settings-section-label">Custom Image / GIF</div>
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
          <div
            className={`bg-upload-btn${dragOver ? ' bg-upload-btn--drag-over' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            ＋ Upload image or GIF
            <span className="bg-upload-hint">drag & drop or click · max {SIZE_LIMIT_MB} MB · jpg · png · gif · webp</span>
          </div>
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
                value={config.scalingMode ?? 'fit'}
                onChange={e => setConfig({ ...config, scalingMode: e.target.value as 'cover' | 'fit' })}
              >
                <option value="cover">Cover (crop to fill)</option>
                <option value="fit">Fit (preserve ratio)</option>
              </select>
            </div>
            {(config.scalingMode ?? 'fit') === 'fit' && (
              <div className="bg-scaling-row">
                <span className="bg-scaling-label">Bar color</span>
                <button
                  ref={letterboxBtnRef}
                  className="bg-color-swatch bg-letterbox-swatch"
                  style={{ background: config.letterboxColor ?? '#000000' }}
                  onClick={() => setLbPickerOpen(true)}
                />
                <span className="bg-color-hint">{config.letterboxColor ?? '#000000'}</span>
              </div>
            )}
          </>
        )}
      </section>

      <CustomColorPicker
        value={config.letterboxColor ?? '#000000'}
        onChange={hex => setConfig({ ...config, letterboxColor: hex })}
        anchorRef={letterboxBtnRef}
        open={lbPickerOpen}
        onClose={() => setLbPickerOpen(false)}
      />

      <CustomColorPicker
        value={pickerValue}
        onChange={handleCustomColorPick}
        anchorRef={customSwatchRef}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
