import { useRef, useState } from 'react';
import { getAdaptiveColor } from '../../lib/colorUtils';
import { COLOR_PRESETS } from '../../lib/presets';
import CustomColorPicker from './CustomColorPicker';
import { SettingsRow } from './Form';
import './SwatchPicker.css';

interface Props {
  /** Active preset id, if a named preset is selected — takes priority over customColor. */
  presetId?: string;
  /** The raw anchor hex of the active custom color, when no preset is active. */
  customColor?: string;
  /** Which theme customColor was picked under — see getAdaptiveColor (colorUtils.ts). */
  customColorScheme?: 'dark' | 'light';
  isDark: boolean;
  onSelectPreset: (id: string) => void;
  onSelectCustom: (hex: string, scheme: 'dark' | 'light') => void;
  variant?: 'compact' | 'large';
}

export default function SwatchPicker({
  presetId, customColor, customColorScheme, isDark,
  onSelectPreset, onSelectCustom, variant = 'compact',
}: Props) {
  const customBtnRef = useRef<HTMLButtonElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const isCustomActive = !presetId && !!customColor;
  // Live theme-accurate preview: exact for the mode it was picked in, derived otherwise.
  const customPreview = customColor
    ? getAdaptiveColor({ color: customColor, pickedInDark: customColorScheme !== 'light' }, isDark)
    : '#6366f1';

  const handlePick = (hex: string) => onSelectCustom(hex, isDark ? 'dark' : 'light');

  const presetGrid = variant === 'large' ? (
    <div className="preset-grid">
      {COLOR_PRESETS.map(p => (
        <button
          key={p.id}
          className={`preset-tile sg-swatch--lg${presetId === p.id ? ' active' : ''}`}
          data-preset-id={p.id}
          onClick={() => onSelectPreset(p.id)}
        >
          {presetId === p.id && <span className="sg-swatch-check-lg">✓</span>}
          <span className="preset-tile-label">{p.label}</span>
        </button>
      ))}
    </div>
  ) : (
    <div className="sg-swatch-row">
      {COLOR_PRESETS.map(p => (
        <button
          key={p.id}
          className={`sg-swatch${presetId === p.id ? ' sg-swatch--active' : ''}`}
          data-swatch-id={p.id}
          title={p.label}
          onClick={() => onSelectPreset(p.id)}
        >
          {presetId === p.id && <span className="sg-swatch-check">✓</span>}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {presetGrid}

      <SettingsRow label="Custom Color">
        <button
          ref={customBtnRef}
          className={`bg-color-swatch${isCustomActive ? ' active' : ''}`}
          style={{ background: customPreview }}
          onClick={() => setPickerOpen(true)}
        />
      </SettingsRow>

      <CustomColorPicker
        value={customPreview}
        onChange={handlePick}
        anchorRef={customBtnRef}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}
