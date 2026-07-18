import './Form.css';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export default function SegmentedControl<T extends string>({ options, value, onChange, disabled = false }: Props<T>) {
  return (
    <div className={`sg-form-seg${disabled ? ' sg-form-seg--disabled' : ''}`}>
      {options.map(o => (
        <button
          key={o.value}
          className={`sg-form-seg-btn${value === o.value ? ' active' : ''}`}
          onClick={() => onChange(o.value)}
          disabled={disabled}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
