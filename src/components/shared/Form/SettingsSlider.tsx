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
  // Percentage of the track that is "filled" left of the thumb. Firefox paints
  // this natively via ::-moz-range-progress; WebKit has no such pseudo-element,
  // so we expose it as a CSS var and paint a hard-stop gradient on the track.
  const fillPct = max > min ? ((value - min) / (max - min)) * 100 : 0;

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
        style={{ ['--sg-slider-fill' as string]: `${fillPct}%` }}
      />
    </div>
  );
}
