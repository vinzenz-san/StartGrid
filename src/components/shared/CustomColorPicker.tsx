import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, flip, shift, offset, autoUpdate } from '@floating-ui/react';
import { hsv2hex, hex2hsv } from '../../lib/colorUtils';
import './CustomColorPicker.css';

interface Props {
  value:      string;
  onChange:   (hex: string) => void;
  anchorRef:  React.RefObject<HTMLElement | null>;
  open:       boolean;
  onClose:    () => void;
  onReset?:   () => void;
  isDefault?: boolean;
}

export default function CustomColorPicker({ value, onChange, anchorRef, open, onClose, onReset, isDefault }: Props) {
  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(0.7);
  const [val, setVal] = useState(0.8);
  const [hexInput, setHexInput] = useState(value);

  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  // Sync floating-ui reference to the external anchor element
  useEffect(() => {
    refs.setReference(anchorRef.current);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // When picker opens, derive HSV from the current hex value
  useEffect(() => {
    if (open) {
      const [h, s, v] = hex2hsv(value);
      setHue(h); setSat(s); setVal(v);
      setHexInput(value);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside pointer-down (same pattern as WidgetContainer)
  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!anchorRef.current?.contains(t) && !refs.floating.current?.contains(t))
        onClose();
    };
    document.addEventListener('pointerdown', handler, { capture: true });
    return () => document.removeEventListener('pointerdown', handler, { capture: true });
  }, [open, anchorRef, onClose, refs.floating]);

  const emit = (h: number, s: number, v: number) => {
    const hex = hsv2hex(h, s, v);
    setHexInput(hex);
    onChange(hex);
  };

  // ── SV square (2-D gradient field) ──────────────────
  const handleSVDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const update = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const ns = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      const nv = Math.max(0, Math.min(1, 1 - (ev.clientY - r.top) / r.height));
      setSat(ns); setVal(nv);
      emit(hue, ns, nv);
    };
    el.addEventListener('pointermove', update);
    el.addEventListener('pointerup', () => el.removeEventListener('pointermove', update), { once: true });
    update(e.nativeEvent);
  };

  // ── Hue strip (1-D) ─────────────────────────────────
  const handleHueDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const update = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const nh = Math.max(0, Math.min(360, ((ev.clientX - r.left) / r.width) * 360));
      setHue(nh);
      emit(nh, sat, val);
    };
    el.addEventListener('pointermove', update);
    el.addEventListener('pointerup', () => el.removeEventListener('pointermove', update), { once: true });
    update(e.nativeEvent);
  };

  // ── Hex text input ───────────────────────────────────
  const handleHexChange = (raw: string) => {
    setHexInput(raw);
    const clean = raw.replace(/[^0-9a-f]/gi, '');
    if (clean.length === 6) {
      const hex = `#${clean}`;
      const [h, s, v] = hex2hsv(hex);
      setHue(h); setSat(s); setVal(v);
      onChange(hex);
    }
  };

  const hueStop  = `hsl(${hue}, 100%, 50%)`;
  const previewHex = hsv2hex(hue, sat, val);

  if (!open) return null;

  return createPortal(
    <div ref={refs.setFloating} className="ccp-panel" style={floatingStyles}>

      {/* Saturation / Value field */}
      <div
        className="ccp-sv"
        style={{ background: `linear-gradient(to right, #fff, ${hueStop})` }}
        onPointerDown={handleSVDown}
      >
        <div className="ccp-sv-dark" />
        <div
          className="ccp-sv-thumb"
          style={{ left: `${sat * 100}%`, top: `${(1 - val) * 100}%` }}
        />
      </div>

      {/* Hue strip */}
      <div className="ccp-hue" onPointerDown={handleHueDown}>
        <div className="ccp-hue-thumb" style={{ left: `${(hue / 360) * 100}%` }} />
      </div>

      {/* Preview swatch + hex input */}
      <div className="ccp-footer">
        <div className="ccp-preview" style={{ background: previewHex }} />
        <span className="ccp-hash">#</span>
        <input
          className="ccp-hex"
          value={hexInput.replace('#', '')}
          maxLength={6}
          spellCheck={false}
          onChange={e => handleHexChange(e.target.value)}
          onBlur={() => setHexInput(previewHex)}
          onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </div>

      {onReset && (
        <button
          className="ccp-reset"
          disabled={isDefault ?? false}
          onPointerDown={e => e.stopPropagation()}
          onClick={() => { onReset(); onClose(); }}
        >
          Reset to default
        </button>
      )}
    </div>,
    document.body
  );
}
