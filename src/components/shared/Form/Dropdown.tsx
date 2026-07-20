import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, flip, shift, offset, autoUpdate, size } from '@floating-ui/react';
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
  className?: string;
  /** 'match-trigger' (default) locks the popover width to the trigger's own
   *  width — the norm for full-width sidebar rows. 'auto' instead sizes the
   *  popover to its content (min-width + no wrap) for triggers that sit in a
   *  narrow column but list long, non-wrapping option labels. */
  menuWidth?: 'match-trigger' | 'auto';
}

export default function Dropdown<T extends string>({ options, value, onChange, disabled = false, className, menuWidth = 'match-trigger' }: Props<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value);

  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    middleware: [
      offset(4),
      flip(),
      shift({ padding: 8 }),
      menuWidth === 'match-trigger'
        ? size({
            apply({ rects, elements }) {
              Object.assign(elements.floating.style, { width: `${rects.reference.width}px`, minWidth: '' });
            },
          })
        : size({
            apply({ availableWidth, elements }) {
              Object.assign(elements.floating.style, { width: '', maxWidth: `${Math.min(availableWidth, 320)}px` });
            },
          }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Close on outside pointer-down — same pattern as WidgetContainer / CustomColorPicker
  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!refs.reference.current?.contains?.(t as Node) && !refs.floating.current?.contains(t))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', handler, { capture: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', handler, { capture: true });
      document.removeEventListener('keydown', onKey);
    };
  }, [open, refs.reference, refs.floating]);

  return (
    <div className={`sg-dropdown${disabled ? ' sg-dropdown--disabled' : ''}${className ? ` ${className}` : ''}`}>
      <button
        ref={refs.setReference}
        type="button"
        className={`sg-dropdown-trigger${open ? ' active' : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
      >
        <span className="sg-dropdown-trigger-label">{current?.label ?? ''}</span>
        <span className={`sg-dropdown-chevron${open ? ' sg-dropdown-chevron--open' : ''}`} aria-hidden="true">▾</span>
      </button>
      {open && createPortal(
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className={`sg-dropdown-menu${menuWidth === 'auto' ? ' sg-dropdown-menu--auto' : ''}`}
          role="listbox"
        >
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
        </div>,
        document.body
      )}
    </div>
  );
}
