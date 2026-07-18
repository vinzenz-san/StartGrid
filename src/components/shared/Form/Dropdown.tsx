import { useEffect, useRef, useState } from 'react';
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

export default function Dropdown<T extends string>({ options, value, onChange, disabled = false }: Props<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`sg-dropdown${disabled ? ' sg-dropdown--disabled' : ''}`} ref={rootRef}>
      <button
        type="button"
        className={`sg-dropdown-trigger${open ? ' active' : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
      >
        <span className="sg-dropdown-trigger-label">{current?.label ?? ''}</span>
        <span className={`sg-dropdown-chevron${open ? ' sg-dropdown-chevron--open' : ''}`} aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="sg-dropdown-menu" role="listbox">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={`sg-dropdown-item${o.value === value ? ' active' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {o.label}
              {o.value === value && <span className="sg-dropdown-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
