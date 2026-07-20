import { useRef, useState, useEffect } from 'react';
import type { ClockData } from '../../../types/widget';
import { SettingsRow, SegmentedControl, SettingsSwitch, Dropdown } from '../../shared/Form';
import { DetailedSettings } from '../../Layout/DetailedSettings';
import CustomColorPicker from '../../shared/CustomColorPicker';
import { useSettings } from '../../../contexts/SettingsContext';
import { LOCALES } from '../../../i18n';
import './Clock.css';

// undefined timeZone (the Intl default) means "use the system/local timezone".
const resolveTimeZone = (timezone?: string) => (timezone && timezone !== 'local' ? timezone : undefined);

function formatTime(d: Date, fmt: '12h' | '24h', secs: boolean, timezone?: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: secs ? '2-digit' : undefined,
    hour12: fmt === '12h',
    timeZone: resolveTimeZone(timezone),
  }).formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const h = get('hour').padStart(2, '0');
  const m = get('minute');
  const s = get('second');
  if (fmt === '24h') return secs ? `${h}:${m}:${s}` : `${h}:${m}`;
  const period = get('dayPeriod').toUpperCase();
  return secs ? `${h}:${m}:${s} ${period}` : `${h}:${m} ${period}`;
}

// IANA timezone ids giving full, gapless UTC coverage from UTC-11 through
// UTC+12, sorted chronologically west to east, plus the 'local' sentinel for
// the system timezone (the default). One representative city/id per offset.
const TIMEZONE_IDS = [
  'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles', 'America/Denver',
  'America/Chicago', 'America/New_York', 'America/Sao_Paulo', 'Atlantic/Azores',
  'Europe/London', 'Europe/Berlin', 'Europe/Athens',
  'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Bangkok',
  'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
] as const;

const TIMEZONE_CITY_LABELS: Record<typeof TIMEZONE_IDS[number], string> = {
  'Pacific/Honolulu':    'Honolulu',
  'America/Anchorage':   'Anchorage',
  'America/Los_Angeles': 'Los Angeles',
  'America/Denver':      'Denver',
  'America/Chicago':     'Chicago',
  'America/New_York':    'New York',
  'America/Sao_Paulo':   'São Paulo / Buenos Aires',
  'Atlantic/Azores':     'Azores / Cape Verde',
  'Europe/London':       'London',
  'Europe/Berlin':       'Berlin / Paris',
  'Europe/Athens':       'Cairo / Athens',
  'Asia/Dubai':          'Dubai',
  'Asia/Karachi':        'Karachi',
  'Asia/Kolkata':        'Mumbai / New Delhi',
  'Asia/Dhaka':          'Dhaka / Almaty',
  'Asia/Bangkok':        'Bangkok / Jakarta',
  'Asia/Shanghai':       'Shanghai / Singapore',
  'Asia/Tokyo':          'Tokyo / Seoul',
  'Australia/Sydney':    'Sydney / Melbourne',
  'Pacific/Auckland':    'Auckland',
};

// Current GMT offset for a timezone (DST-aware, since it's computed against
// "now" rather than a fixed value) — e.g. 'GMT+2', 'GMT-4', 'GMT+0'.
function gmtOffsetLabel(timeZone: string | undefined): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(new Date());
    const raw = parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT+0';
    return raw === 'GMT' ? 'GMT+0' : raw;
  } catch {
    return 'GMT+0';
  }
}

// ── Settings ───────────────────────────────────────────────────────────────

interface SettingsProps {
  data: ClockData;
  onUpdateData: (patch: Partial<ClockData>) => void;
}

export function ClockSettings({ data, onUpdateData }: SettingsProps) {
  const { t } = useSettings();
  const { format = '24h', showSeconds = true, showDate = true,
          fontSize = 'M', dateFontSize = 'M', isBold = false, boldDate = false, fontColor,
          timezone = 'local' } = data;
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerValue = fontColor ?? '#ffffff';

  const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
    { value: 'local', label: `${t('widget.clock.tzLocal')} (${gmtOffsetLabel(undefined)})` },
    { value: 'UTC',   label: `${t('widget.clock.tzUtc')} (${gmtOffsetLabel('UTC')})` },
    ...TIMEZONE_IDS.map(id => ({ value: id as string, label: `${TIMEZONE_CITY_LABELS[id]} (${gmtOffsetLabel(id)})` })),
  ];

  return (
    <div className="sg-clock-settings" onClick={e => e.stopPropagation()}>
      <SettingsRow label={t('widget.clock.format')}>
        <SegmentedControl
          options={[{ value: '24h', label: '24h' }, { value: '12h', label: '12h' }]}
          value={format}
          onChange={v => onUpdateData({ format: v })}
        />
      </SettingsRow>
      <SettingsRow label={t('widget.clock.timezone')}>
        <Dropdown
          options={TIMEZONE_OPTIONS}
          value={timezone}
          onChange={v => onUpdateData({ timezone: v })}
          menuWidth="auto"
        />
      </SettingsRow>

      <DetailedSettings title={t('widget.clock.formattingSettings')}>
        <SettingsRow label={t('widget.clock.showSeconds')}>
          <SettingsSwitch checked={showSeconds} onChange={v => onUpdateData({ showSeconds: v })} />
        </SettingsRow>
        <SettingsRow label={t('widget.clock.showDate')}>
          <SettingsSwitch checked={showDate} onChange={v => onUpdateData({ showDate: v })} />
        </SettingsRow>
        <SettingsRow label={t('widget.clock.timeSize')}>
          <SegmentedControl
            options={[
              { value: 'S',  label: 'S'  },
              { value: 'M',  label: 'M'  },
              { value: 'L',  label: 'L'  },
              { value: 'XL', label: 'XL' },
            ]}
            value={fontSize}
            onChange={v => onUpdateData({ fontSize: v as ClockData['fontSize'] })}
          />
        </SettingsRow>
        <SettingsRow label={t('widget.clock.dateSize')}>
          <SegmentedControl
            options={[
              { value: 'S', label: 'S' },
              { value: 'M', label: 'M' },
              { value: 'L', label: 'L' },
            ]}
            value={dateFontSize}
            onChange={v => onUpdateData({ dateFontSize: v as ClockData['dateFontSize'] })}
          />
        </SettingsRow>
        <SettingsRow label={t('widget.clock.boldTime')}>
          <SettingsSwitch checked={isBold} onChange={v => onUpdateData({ isBold: v })} />
        </SettingsRow>
        <SettingsRow label={t('widget.clock.boldDate')}>
          <SettingsSwitch checked={boldDate} onChange={v => onUpdateData({ boldDate: v })} />
        </SettingsRow>
        <SettingsRow label={t('widget.clock.fontColor')}>
          <button
            ref={colorBtnRef}
            className="sg-clock-color-btn"
            style={{ background: pickerValue }}
            title={t('widget.clock.pickFontColor')}
            onClick={() => setPickerOpen(o => !o)}
            onPointerDown={e => e.stopPropagation()}
          />
        </SettingsRow>
      </DetailedSettings>

      <CustomColorPicker
        value={pickerValue}
        onChange={color => onUpdateData({ fontColor: color })}
        anchorRef={colorBtnRef}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onReset={() => onUpdateData({ fontColor: undefined })}
        isDefault={fontColor === undefined}
      />
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────

interface Props {
  data: ClockData;
  onUpdateData: (patch: Partial<ClockData>) => void;
}

export default function Clock({ data }: Props) {
  const { language } = useSettings();
  const { format = '24h', showSeconds = true, showDate = true,
          fontSize = 'M', dateFontSize = 'M', isBold = false, boldDate = false, fontColor,
          timezone = 'local' } = data;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateStr = new Intl.DateTimeFormat(LOCALES[language], {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: resolveTimeZone(timezone),
  }).format(now);

  const style = {
    ...(fontColor ? { '--clock-color': fontColor } as React.CSSProperties : {}),
  };

  return (
    <div className="sg-clock" style={style}>
      <div className={`sg-clock-time sg-clock-time--size-${fontSize.toLowerCase()}${isBold ? ' sg-clock-time--bold' : ''}`}>{formatTime(now, format, showSeconds, timezone)}</div>
      {showDate && <div className={`sg-clock-date sg-clock-date--size-${dateFontSize.toLowerCase()}${boldDate ? ' sg-clock-date--bold' : ''}`}>{dateStr}</div>}
    </div>
  );
}
