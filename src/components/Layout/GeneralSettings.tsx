import { useSettings } from '../../contexts/SettingsContext';
import type { Language } from '../../contexts/SettingsContext';
import { SettingsRow, SegmentedControl } from '../shared/Form';

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'de', label: 'DE' },
];

export default function GeneralSettings() {
  const { language, updateSettings } = useSettings();

  return (
    <div className="sg-settings-general">
      <section className="settings-section" style={{ paddingBottom: 12 }}>
        <div className="settings-section-label">Language</div>
        <SettingsRow label="Language">
          <SegmentedControl<Language>
            options={LANGUAGE_OPTIONS}
            value={language}
            onChange={v => updateSettings({ language: v })}
          />
        </SettingsRow>
      </section>
    </div>
  );
}
