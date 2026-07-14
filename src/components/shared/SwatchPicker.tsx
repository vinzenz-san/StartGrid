import { useRef, useState } from 'react';
import { generateGradient } from '../../lib/colorUtils';
import CustomColorPicker from './CustomColorPicker';
import './SwatchPicker.css';

const RAINBOW_BG = 'linear-gradient(135deg, #6366f1 0%, #ec4899 40%, #f59e0b 70%, #10b981 100%)';

export const THEME_SWATCHES = [
  { id: 'midnight', label: 'Midnight',
    color: '#2a2d3d', flatColor: '#1a1d2e',
    css: 'linear-gradient(135deg, #0f1117 0%, #1a1d2e 100%)',
    darkEnd: '#1a1d2e', darkStart: '#3f4272',
    lightEnd: '#e2e8f0', lightStart: '#94a3b8' },
  { id: 'aurora',   label: 'Aurora',
    color: '#1a3327', flatColor: '#1b4332',
    css: 'linear-gradient(135deg, #0d1b2a 0%, #1b4332 50%, #081c15 100%)',
    darkEnd: '#1b4332', darkStart: '#15803d',
    lightEnd: '#dcfce7', lightStart: '#86efac' },
  { id: 'dusk',     label: 'Dusk',
    color: '#2d2445', flatColor: '#2d1b69',
    css: 'linear-gradient(135deg, #1a0533 0%, #2d1b69 50%, #11032e 100%)',
    darkEnd: '#2d1b69', darkStart: '#6d28d9',
    lightEnd: '#f3e8ff', lightStart: '#d8b4fe' },
  { id: 'ocean',    label: 'Ocean',
    color: '#1a2d55', flatColor: '#023e8a',
    css: 'linear-gradient(135deg, #03071e 0%, #023e8a 100%)',
    darkEnd: '#023e8a', darkStart: '#1d4ed8',
    lightEnd: '#dbeafe', lightStart: '#93c5fd' },
  { id: 'ember',    label: 'Ember',
    color: '#3d2420', flatColor: '#7c2d12',
    css: 'linear-gradient(135deg, #1a0a00 0%, #7c2d12 50%, #450a00 100%)',
    darkEnd: '#7c2d12', darkStart: '#c2410c',
    lightEnd: '#ffedd5', lightStart: '#fdba74' },
];

interface Props {
  value:    string;
  onChange: (color: string, presetId?: string) => void;
  variant?: 'compact' | 'large';
}

export default function SwatchPicker({ value, onChange, variant = 'compact' }: Props) {
  const customBtnRef = useRef<HTMLButtonElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const isPreset = THEME_SWATCHES.some(s => s.color === value);
  const isCustom = !isPreset;
  const customBg = isCustom ? generateGradient(value) : RAINBOW_BG;

  // Initial color for the picker: current value if custom, otherwise a neutral default
  const pickerValue = isCustom ? value : '#2a2d3d';

  if (variant === 'large') {
    return (
      <>
        <div className="preset-grid">
          {THEME_SWATCHES.map(s => (
            <button
              key={s.id}
              className={`preset-tile sg-swatch--lg${value === s.color ? ' active' : ''}`}
              data-preset-id={s.id}
              onClick={() => onChange(s.color, s.id)}
            >
              {value === s.color && <span className="sg-swatch-check-lg">✓</span>}
              <span className="preset-tile-label">{s.label}</span>
            </button>
          ))}

          <button
            ref={customBtnRef}
            className={`preset-tile sg-swatch--lg sg-swatch--lg-custom${isCustom ? ' active' : ''}`}
            style={{ background: customBg }}
            onClick={() => setPickerOpen(true)}
          >
            {isCustom && <span className="sg-swatch-check-lg">✓</span>}
            <span className="preset-tile-label">Custom</span>
          </button>
        </div>

        <CustomColorPicker
          value={pickerValue}
          onChange={color => onChange(color, undefined)}
          anchorRef={customBtnRef}
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className="sg-swatch-row">
        {THEME_SWATCHES.map(s => (
          <button
            key={s.id}
            className={`sg-swatch${value === s.color ? ' sg-swatch--active' : ''}`}
            data-swatch-id={s.id}
            title={s.label}
            onClick={() => onChange(s.color, s.id)}
          >
            {value === s.color && <span className="sg-swatch-check">✓</span>}
          </button>
        ))}

        <button
          ref={customBtnRef}
          className={`sg-swatch sg-swatch--custom${isCustom ? ' sg-swatch--active' : ''}`}
          style={{ background: isCustom ? value : 'linear-gradient(135deg, #6366f1, #ec4899, #f59e0b)' }}
          title="Custom color"
          onClick={() => setPickerOpen(true)}
        >
          {isCustom && <span className="sg-swatch-check">✓</span>}
          {!isCustom && <span className="sg-swatch-plus">＋</span>}
        </button>
      </div>

      <CustomColorPicker
        value={pickerValue}
        onChange={color => onChange(color)}
        anchorRef={customBtnRef}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}
