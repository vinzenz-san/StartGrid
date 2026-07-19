import { useRef, useState, useEffect } from 'react';
import { useBackground } from '../../contexts/BackgroundContext';
import { PRESETS, BackgroundMode, BackgroundPanel, BackgroundPosition, UnsplashConfig } from '../../types/background';
import { generateGradient } from '../../lib/colorUtils';
import { BACKGROUND_PROVIDERS } from './providers';
import CustomColorPicker from '../shared/CustomColorPicker';
import { SettingsSlider, SettingsRow, SettingsSwitch, SegmentedControl, Dropdown } from '../shared/Form';
import UnsplashSettings from './UnsplashSettings';
import { DetailedSettings } from '../Layout/DetailedSettings';
import './BackgroundEditor.css';

const SIZE_LIMIT_MB = 5;
const RAINBOW_BG = 'linear-gradient(135deg, #6366f1 0%, #ec4899 40%, #f59e0b 70%, #10b981 100%)';

const DATE_MODE_OPTIONS = [
  { value: 'today' as const,  label: 'Today' },
  { value: 'custom' as const, label: 'Custom Date' },
];

const POSITION_OPTIONS: { value: BackgroundPosition; label: string }[] = [
  { value: 'center',       label: 'Center' },
  { value: 'top',          label: 'Top' },
  { value: 'bottom',       label: 'Bottom' },
  { value: 'left',         label: 'Left' },
  { value: 'right',        label: 'Right' },
  { value: 'top-left',     label: 'Top Left' },
  { value: 'top-right',    label: 'Top Right' },
  { value: 'bottom-left',  label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
];

const noLabel = () => '';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type EditorTab = BackgroundPanel;

// Labels for the dropdown itself — a panel groups several provider modes
// (e.g. "colors" spans preset/color/gradient), so it isn't any single
// provider's own `label`.
const PANEL_LABELS: Record<EditorTab, string> = {
  colors: 'Presets',
  image: 'Upload Image',
  unsplash: 'Unsplash',
  bing: 'Bing Daily Wallpaper',
  astronomy: 'Astronomy Picture of the Day',
  gradient: 'Colour Gradient',
  online: 'Online Image',
  wikimedia: 'Wikimedia Image of the Day',
};

// Dynamically derived from the registry (deduped by panel), then sorted
// alphabetically by label so a future provider just needs to declare its
// `panel` to show up here in the right place — no hardcoded tab list to maintain.
const PANEL_OPTIONS: { value: EditorTab; label: string }[] = (() => {
  const seen = new Set<EditorTab>();
  const options: { value: EditorTab; label: string }[] = [];
  for (const def of Object.values(BACKGROUND_PROVIDERS)) {
    if (!seen.has(def.panel)) {
      seen.add(def.panel);
      options.push({ value: def.panel, label: PANEL_LABELS[def.panel] });
    }
  }
  options.sort((a, b) => a.label.localeCompare(b.label));
  return options;
})();

function modeToTab(mode: BackgroundMode): EditorTab {
  return BACKGROUND_PROVIDERS[mode]?.panel ?? 'colors';
}

export default function BackgroundEditor() {
  const { config, customImageUrl, setConfig, setCustomImage, clearCustomImage, bing, astronomy } = useBackground();
  const fileRef        = useRef<HTMLInputElement>(null);
  const customSwatchRef = useRef<HTMLDivElement>(null);
  const letterboxBtnRef = useRef<HTMLButtonElement>(null);
  const [dragOver, setDragOver]       = useState(false);
  const [pickerOpen, setPickerOpen]   = useState(false);
  const [lbPickerOpen, setLbPickerOpen] = useState(false);

  const activeTab = modeToTab(config.mode);

  const lastUnsplashConfig = useRef<UnsplashConfig>({ mode: 'unsplash', value: '', source: 'topics', showAttribution: true });
  useEffect(() => {
    if (config.mode === 'unsplash') lastUnsplashConfig.current = config as UnsplashConfig;
  }, [config]);

  const switchTab = (tab: EditorTab) => {
    if (tab === activeTab) return;
    if (tab === 'colors')   { setConfig({ ...config, mode: 'preset', value: PRESETS[0].id }); return; }
    if (tab === 'image')    { setConfig({ mode: 'custom', value: '' }); return; }
    if (tab === 'unsplash') { setConfig(lastUnsplashConfig.current); return; }
    if (tab === 'bing')     { setConfig({ mode: 'bing', value: '' }); return; }
    // Placeholder tabs (astronomy / gradient / online / wikimedia) — resolve
    // the mode from the registry rather than hardcoding one branch per future provider.
    const provider = Object.values(BACKGROUND_PROVIDERS).find(def => def.panel === tab);
    if (provider) setConfig({ mode: provider.mode, value: '' } as typeof config);
  };

  const isPlaceholderTab = !['colors', 'image', 'unsplash', 'bing', 'astronomy'].includes(activeTab);

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

  const astro       = config.mode === 'astronomy' ? config : null;
  const isCustomActive = config.mode === 'color' || config.mode === 'gradient';
  const isPresetActive = (id: string) => config.mode === 'preset' && config.value === id;
  const intensity   = config.gradientIntensity ?? (config.customGradient === false ? 0 : 100);
  const customThumbBg = isCustomActive && config.customColor
    ? generateGradient(config.customColor)
    : RAINBOW_BG;
  const pickerValue = config.customColor
    ?? PRESETS.find(p => p.id === config.value)?.css.match(/#[0-9a-f]{6}/i)?.[0]
    ?? '#6366f1';

  const handleCustomColorPick = (hex: string) => {
    setConfig({ ...config, mode: 'gradient', value: generateGradient(hex), customColor: hex });
  };

  return (
    <div className="bg-editor" onClick={e => e.stopPropagation()}>

      {/* ── Mode switcher ── */}
      <Dropdown
        options={PANEL_OPTIONS}
        value={activeTab}
        onChange={switchTab}
      />

      {/* ── Colors tab ── */}
      {activeTab === 'colors' && (
        <>
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
            <DetailedSettings persistenceKey="bg-colors">
              <SettingsSlider
                label="Gradient Intensity"
                value={intensity}
                onChange={v => setConfig({ ...config, gradientIntensity: v })}
              />
            </DetailedSettings>
          </section>
        </>
      )}

      {/* ── Image tab ── */}
      {activeTab === 'image' && (
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
                  <span className="bg-scaling-label">Background</span>
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
      )}

      {/* ── Unsplash tab ── */}
      {activeTab === 'unsplash' && <UnsplashSettings />}

      {/* ── Bing tab — fully automated, nothing to configure ── */}
      {activeTab === 'bing' && (
        <section className="settings-section bg-bing-section">
          <div className="settings-section-label">Bing Daily Wallpaper</div>
          <p className="bg-bing-note">
            Enjoy today&rsquo;s curated Bing background — it refreshes automatically once a day.
          </p>
          {bing.error && <p className="bg-bing-error">{bing.error}</p>}
        </section>
      )}

      {/* ── Astronomy tab — NASA Picture of the Day, refreshes automatically ── */}
      {activeTab === 'astronomy' && astro && (
        <section className="settings-section">
          <div className="settings-section-label">Astronomy Picture of the Day</div>
          {astronomy.error && <p className="bg-bing-error">{astronomy.error}</p>}

          <SettingsRow label="Date">
            <SegmentedControl
              options={DATE_MODE_OPTIONS}
              value={astro.dateMode ?? 'today'}
              onChange={v => setConfig({ ...astro, dateMode: v })}
            />
          </SettingsRow>

          {astro.dateMode === 'custom' && (
            <div className="bg-apod-date-row">
              <span className="bg-apod-date-icon" aria-hidden="true">📅</span>
              <input
                type="date"
                className="bg-apod-date-input"
                value={astro.customDate ?? todayIso()}
                max={todayIso()}
                onChange={e => setConfig({ ...astro, customDate: e.target.value })}
              />
            </div>
          )}

          <SettingsRow label="Show title">
            <SettingsSwitch
              checked={astro.showApodTitle ?? false}
              onChange={v => setConfig({ ...astro, showApodTitle: v })}
            />
          </SettingsRow>

          <DetailedSettings persistenceKey="bg-astronomy">
            <SettingsSlider
              label="Blur"
              value={astro.blur ?? 0}
              onChange={v => setConfig({ ...astro, blur: v })}
              min={0}
              max={100}
              step={1}
              valueFormatter={noLabel}
            />

            <div className="bg-luminosity-slider-wrap">
              <SettingsSlider
                label="Luminosity"
                value={astro.luminosity ?? 100}
                onChange={v => setConfig({ ...astro, luminosity: v })}
                min={0}
                max={200}
                step={5}
                valueFormatter={noLabel}
              />
            </div>

            <SettingsRow label="Scale background to fit">
              <SettingsSwitch
                checked={astro.scaleToFit ?? true}
                onChange={v => setConfig({ ...astro, scaleToFit: v })}
              />
            </SettingsRow>

            <div className="bg-position-row">
              <span className="sg-form-label">Position</span>
              <Dropdown
                options={POSITION_OPTIONS}
                value={astro.position ?? 'center'}
                onChange={v => setConfig({ ...astro, position: v })}
              />
            </div>

            <SettingsRow label="Automatically dim at night">
              <SettingsSwitch
                checked={astro.autoDimNight ?? false}
                onChange={v => setConfig({ ...astro, autoDimNight: v })}
              />
            </SettingsRow>

            {astro.autoDimNight && (
              <div className="bg-night-time-row">
                <div className="bg-night-time-field">
                  <span className="bg-night-time-label">Night starts at</span>
                  <input
                    type="time"
                    className="bg-night-time-input"
                    value={astro.nightStart || '22:00'}
                    onChange={e => setConfig({ ...astro, nightStart: e.target.value || '22:00' })}
                  />
                </div>
                <div className="bg-night-time-field">
                  <span className="bg-night-time-label">Night ends at</span>
                  <input
                    type="time"
                    className="bg-night-time-input"
                    value={astro.nightEnd || '05:00'}
                    onChange={e => setConfig({ ...astro, nightEnd: e.target.value || '05:00' })}
                  />
                </div>
              </div>
            )}
          </DetailedSettings>
        </section>
      )}

      {/* ── Placeholder tabs (gradient / online / wikimedia) — not yet implemented ── */}
      {isPlaceholderTab && (
        <section className="settings-section bg-bing-section">
          <div className="settings-section-label">{PANEL_LABELS[activeTab]}</div>
          <p className="bg-bing-note">Coming soon.</p>
        </section>
      )}

      {/* Color pickers (portal-rendered) */}
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
