import './Form.css';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export default function SettingsSwitch({ checked, onChange, label }: Props) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`sg-form-switch${checked ? ' sg-form-switch--on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="sg-form-switch-thumb" />
    </button>
  );
}
