import { useState, useEffect } from 'react';
import type { ClockData } from '../../../types/widget';
import { SettingsRow, SegmentedControl, SettingsSwitch } from '../../shared/Form';
import './Clock.css';

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatTime(d: Date, fmt: '12h' | '24h', secs: boolean) {
  const h24 = d.getHours();
  const m   = String(d.getMinutes()).padStart(2, '0');
  const s   = String(d.getSeconds()).padStart(2, '0');
  if (fmt === '24h') {
    return secs ? `${String(h24).padStart(2,'0')}:${m}:${s}` : `${String(h24).padStart(2,'0')}:${m}`;
  }
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = String(h24 % 12 || 12).padStart(2, '0');
  return secs ? `${h12}:${m}:${s} ${period}` : `${h12}:${m} ${period}`;
}

// ── Settings ───────────────────────────────────────────────────────────────

interface SettingsProps {
  data: ClockData;
  onUpdateData: (patch: Partial<ClockData>) => void;
}

export function ClockSettings({ data, onUpdateData }: SettingsProps) {
  const { format = '24h', showSeconds = true, showDate = true } = data;
  return (
    <div className="sg-clock-settings" onClick={e => e.stopPropagation()}>
      <SettingsRow label="Format">
        <SegmentedControl
          options={[{ value: '24h', label: '24h' }, { value: '12h', label: '12h' }]}
          value={format}
          onChange={v => onUpdateData({ format: v })}
        />
      </SettingsRow>
      <SettingsRow label="Show seconds">
        <SettingsSwitch checked={showSeconds} onChange={v => onUpdateData({ showSeconds: v })} />
      </SettingsRow>
      <SettingsRow label="Show date">
        <SettingsSwitch checked={showDate} onChange={v => onUpdateData({ showDate: v })} />
      </SettingsRow>
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────

interface Props {
  data: ClockData;
  onUpdateData: (patch: Partial<ClockData>) => void;
}

export default function Clock({ data }: Props) {
  const { format = '24h', showSeconds = true, showDate = true } = data;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateStr = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;

  return (
    <div className="sg-clock">
      <div className="sg-clock-time">{formatTime(now, format, showSeconds)}</div>
      {showDate && <div className="sg-clock-date">{dateStr}</div>}
    </div>
  );
}
