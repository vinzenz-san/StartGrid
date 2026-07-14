import './Form.css';

interface Props {
  label:           string;
  value:           number;
  onChange:        (value: number) => void;
  min?:            number;
  max?:            number;
  step?:           number;
  valueFormatter?: (val: number) => string;
  onPointerDown?:  (e: React.PointerEvent<HTMLInputElement>) => void;
}

const pct = (v: number) => `${v}%`;

export default function SettingsSlider({
  label, value, onChange,
  min = 0, max = 100, step = 5,
  valueFormatter = pct,
  onPointerDown,
}: Props) {
  return (
    <div className="sg-settings-slider">
      <div className="sg-settings-slider-header">
        <span className="sg-settings-slider-label">{label}</span>
        <span className="sg-settings-slider-val">{valueFormatter(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        onPointerDown={onPointerDown}
      />
    </div>
  );
}
