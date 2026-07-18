import { useEffect, useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import './ThemeToggle.css';

interface Props {
  /** Controlled mode: current state + change handler. Omit both to drive the global app theme instead. */
  isDark?: boolean;
  onToggle?: (nextIsDark: boolean) => void;
}

export default function ThemeToggle({ isDark: controlledIsDark, onToggle }: Props = {}) {
  const { colorScheme, updateSettings } = useSettings();
  const isControlled = onToggle !== undefined;
  const isDark = isControlled ? (controlledIsDark ?? true) : colorScheme !== 'light';

  // Local visual state so the pill animates immediately on click,
  // independent of the 160ms delay before updateSettings fires.
  const [pillDark, setPillDark] = useState(isDark);
  useEffect(() => { setPillDark(isDark); }, [isDark]);

  const handleToggle = () => {
    if (isControlled) {
      // Scoped toggle (e.g. a single widget) — instant flip, no full-page overlay.
      setPillDark(d => !d);
      onToggle!(!isDark);
      return;
    }

    setPillDark(d => !d); // knob moves instantly

    // Always a dark overlay — no white involved in either direction.
    // dark→light: invisible fade-in over dark page, slow reveal of light theme.
    // light→dark: cinematic dip to dark, theme switches, reveals dark theme.
    // Max opacity 0.85 keeps widgets dimmed-but-visible rather than fully hidden.
    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:999999',
      'background:#0f1117',
      'opacity:0', 'pointer-events:none',
      'transition:opacity 0.2s ease',
    ].join(';');
    document.body.appendChild(overlay);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      overlay.style.opacity = '0.85';
      setTimeout(() => {
        updateSettings({ colorScheme: isDark ? 'light' : 'dark' });
        overlay.style.transition = 'opacity 0.9s ease';
        overlay.style.opacity = '0';
        overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
      }, 160);
    }));
  };

  return (
    <button
      className={`sg-theme-toggle${pillDark ? ' sg-theme-toggle--dark' : ''}`}
      onClick={handleToggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
    >
      <span className="sg-theme-toggle__track" />
      <span className="sg-theme-toggle__knob">
        {pillDark
          ? /* Moon */
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          : /* Sun */
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
        }
      </span>
    </button>
  );
}
