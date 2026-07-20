import type { DisplaySettings } from '../../../types/widget';
import SettingsSlider from './SettingsSlider';
import { useSettings } from '../../../contexts/SettingsContext';
import './FontSettingsPanel.css'; // reuses the generic .sg-fs-panel column layout

interface Props {
  value:    DisplaySettings | undefined;
  onChange: (patch: Partial<DisplaySettings>) => void;
  /** The widget's own "no override" font size (e.g. Clock 42, Greeting 22) —
   *  shown as the slider's resting value until the user actually moves it. */
  defaultFontSize?: number;
}

/**
 * Generic "Display Settings" block — TablissNG parity for Font Size / Scale /
 * Rotation only (Position and Custom CSS Class are out of scope for this app).
 * Reusable the same way as FontSettingsPanel: any widget adds
 * `displaySettings?: DisplaySettings` to its own data type.
 */
export default function DisplaySettingsPanel({ value, onChange, defaultFontSize = 42 }: Props) {
  const { t } = useSettings();
  const ds = value ?? {};

  return (
    <div className="sg-fs-panel" onClick={e => e.stopPropagation()}>
      <SettingsSlider
        label={t('widget.displaySettings.fontSize')}
        value={ds.fontSize ?? defaultFontSize}
        min={2}
        max={100}
        step={2}
        valueFormatter={v => `${v}px`}
        onChange={v => onChange({ fontSize: v })}
      />

      <SettingsSlider
        label={t('widget.displaySettings.scale')}
        value={ds.scale ?? 1}
        min={0}
        max={3}
        step={0.1}
        valueFormatter={v => `${v.toFixed(1)}x`}
        onChange={v => onChange({ scale: v })}
      />

      <SettingsSlider
        label={t('widget.displaySettings.rotation')}
        value={ds.rotation ?? 0}
        min={-180}
        max={180}
        step={1}
        valueFormatter={v => `${v}°`}
        onChange={v => onChange({ rotation: v })}
      />
    </div>
  );
}
