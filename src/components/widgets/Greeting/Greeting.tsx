import { useEffect, useState } from 'react';
import type { GreetingData, WidgetAlignment } from '../../../types/widget';
import { SettingsRow, SegmentedControl, SettingsSwitch, Dropdown } from '../../shared/Form';
import { useSettings } from '../../../contexts/SettingsContext';
import { interpolate, type TranslationKey } from '../../../i18n';
import './Greeting.css';

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

const GREETING_KEYS: Record<TimeOfDay, { plain: TranslationKey; named: TranslationKey }> = {
  morning:   { plain: 'widget.greeting.morning',   named: 'widget.greeting.morningNamed' },
  afternoon: { plain: 'widget.greeting.afternoon', named: 'widget.greeting.afternoonNamed' },
  evening:   { plain: 'widget.greeting.evening',   named: 'widget.greeting.eveningNamed' },
  night:     { plain: 'widget.greeting.night',     named: 'widget.greeting.nightNamed' },
};

// ── Settings ───────────────────────────────────────────────────────────────

interface SettingsProps {
  data: GreetingData;
  onUpdateData: (patch: Partial<GreetingData>) => void;
}

export function GreetingSettings({ data, onUpdateData }: SettingsProps) {
  const { t } = useSettings();
  const userName       = data.userName ?? '';
  const useCustomQuote = data.useCustomQuote ?? false;
  const customQuote    = data.customQuote ?? '';
  const textSize       = data.textSize ?? 'M';
  const alignment      = data.alignment ?? 'left';

  const ALIGNMENT_OPTIONS: { value: WidgetAlignment; label: string }[] = [
    { value: 'left',   label: t('widget.quicklinks.align.left') },
    { value: 'center', label: t('widget.quicklinks.align.center') },
    { value: 'right',  label: t('widget.quicklinks.align.right') },
  ];

  return (
    <div className="sg-greeting-settings" onClick={e => e.stopPropagation()}>
      <SettingsRow label={t('widget.greeting.nameLabel')}>
        <input
          className="sg-greeting-input"
          placeholder={t('widget.greeting.namePlaceholder')}
          value={userName}
          onChange={e => onUpdateData({ userName: e.target.value || undefined })}
          onPointerDown={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          onDragStart={e => e.stopPropagation()}
        />
      </SettingsRow>

      <SettingsRow label={t('widget.greeting.useCustomQuote')}>
        <SettingsSwitch checked={useCustomQuote} onChange={v => onUpdateData({ useCustomQuote: v })} />
      </SettingsRow>

      {useCustomQuote && (
        <SettingsRow label={t('widget.greeting.customQuoteLabel')}>
          <input
            className="sg-greeting-input"
            placeholder={t('widget.greeting.customQuotePlaceholder')}
            value={customQuote}
            onChange={e => onUpdateData({ customQuote: e.target.value || undefined })}
            onPointerDown={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onDragStart={e => e.stopPropagation()}
          />
        </SettingsRow>
      )}

      <SettingsRow label={t('widget.greeting.textSize')}>
        <SegmentedControl
          options={[
            { value: 'S',  label: 'S'  },
            { value: 'M',  label: 'M'  },
            { value: 'L',  label: 'L'  },
            { value: 'XL', label: 'XL' },
          ]}
          value={textSize}
          onChange={v => onUpdateData({ textSize: v as GreetingData['textSize'] })}
        />
      </SettingsRow>

      <SettingsRow label={t('widget.greeting.alignment')}>
        <Dropdown
          options={ALIGNMENT_OPTIONS}
          value={alignment}
          onChange={v => onUpdateData({ alignment: v })}
        />
      </SettingsRow>
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────

interface Props {
  data: GreetingData;
  onUpdateData: (patch: Partial<GreetingData>) => void;
}

export default function Greeting({ data }: Props) {
  const { t } = useSettings();
  const userName       = data.userName;
  const useCustomQuote = data.useCustomQuote ?? false;
  const customQuote    = data.customQuote;
  const textSize       = data.textSize ?? 'M';
  const alignment      = data.alignment ?? 'left';

  const [hour, setHour] = useState(() => new Date().getHours());

  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(id);
  }, []);

  let text: string;
  if (useCustomQuote && customQuote) {
    text = userName ? interpolate(customQuote, { name: userName }) : customQuote;
  } else {
    const keys = GREETING_KEYS[getTimeOfDay(hour)];
    text = userName ? t(keys.named, { name: userName }) : t(keys.plain);
  }

  return (
    <div className={`sg-greeting sg-greeting--align-${alignment}`}>
      <span className={`sg-greeting-text sg-greeting-text--size-${textSize.toLowerCase()}`}>{text}</span>
    </div>
  );
}
