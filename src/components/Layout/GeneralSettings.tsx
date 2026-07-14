import { useRef, useState } from 'react';
import { useSettings, SETTINGS_DEFAULTS } from '../../contexts/SettingsContext';
import type { Language, ColorScheme, GearPosition } from '../../contexts/SettingsContext';
import { SettingsRow, SegmentedControl } from '../shared/Form';
import CustomColorPicker from '../shared/CustomColorPicker';

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'de', label: 'DE' },
];

const SCHEME_OPTIONS: { value: ColorScheme; label: string }[] = [
  { value: 'light',  label: 'Light'  },
  { value: 'dark',   label: 'Dark'   },
  { value: 'system', label: 'System' },
];

const GEAR_OPTIONS: { value: GearPosition; label: string }[] = [
  { value: 'bottom-left',  label: '↙ BL' },
  { value: 'bottom-right', label: '↘ BR' },
  { value: 'top-right',    label: '↗ TR' },
];

export default function GeneralSettings() {
  const { language, colorScheme, accentColor, gearPosition, updateSettings } = useSettings();
  const [pickerOpen, setPickerOpen] = useState(false);
  const swatchRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="sg-settings-general">
      <section className="settings-section">
        <div className="settings-section-label">Language</div>
        <SettingsRow label="Language">
          <SegmentedControl<Language>
            options={LANGUAGE_OPTIONS}
            value={language}
            onChange={v => updateSettings({ language: v })}
          />
        </SettingsRow>
      </section>

      <section className="settings-section">
        <div className="settings-section-label">Appearance</div>
        <SettingsRow label="Theme">
          <SegmentedControl<ColorScheme>
            options={SCHEME_OPTIONS}
            value={colorScheme}
            onChange={v => updateSettings({ colorScheme: v })}
          />
        </SettingsRow>
        <SettingsRow label="Accent Color">
          <div className="sg-accent-controls">
            <button
              ref={swatchRef}
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

      <section className="settings-section" style={{ paddingBottom: 12 }}>
        <div className="settings-section-label">Layout</div>
        <SettingsRow label="Gear position">
          <SegmentedControl<GearPosition>
            options={GEAR_OPTIONS}
            value={gearPosition}
            onChange={v => updateSettings({ gearPosition: v })}
          />
        </SettingsRow>
      </section>

      <CustomColorPicker
        value={accentColor}
        onChange={hex => updateSettings({ accentColor: hex })}
        anchorRef={swatchRef}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
