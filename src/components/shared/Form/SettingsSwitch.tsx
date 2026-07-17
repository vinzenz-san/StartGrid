import './Form.css';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export default function SettingsSwitch({ checked, onChange, label, disabled = false }: Props) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-disabled={disabled}
      className={`sg-form-switch${checked ? ' sg-form-switch--on' : ''}${disabled ? ' sg-form-switch--disabled' : ''}`}
      onClick={() => { if (!disabled) onChange(!checked); }}
    >
      <span className="sg-form-switch-thumb" />
    </button>
  );
}
