import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../../contexts/SettingsContext';
import './Form.css';

interface Props {
  onClick:       () => void;
  children:      React.ReactNode;
  cooldownTime?: number;
  className?:    string;
  variant?:      'default' | 'danger';
  disabled?:     boolean;
}

export default function ActionButton({
  onClick,
  children,
  cooldownTime = 1,
  className = '',
  variant = 'default',
  disabled = false,
}: Props) {
  const { developerOptionsEnabled } = useSettings();
  const [pending,   setPending]   = useState(false);
  const [cooldown,  setCooldown]  = useState(false);
  const [countdown, setCountdown] = useState(cooldownTime);
  const cancelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!cooldown) return;
    setCountdown(cooldownTime);
    const tick = setInterval(() => {
      setCountdown(n => {
        if (n <= 1) { clearInterval(tick); setCooldown(false); return cooldownTime; }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [cooldown, cooldownTime]);

  // Auto-cancel if user ignores the armed state after cooldown expires
  useEffect(() => {
    if (pending && !cooldown) {
      cancelTimer.current = setTimeout(() => setPending(false), 4000);
    }
    return () => { if (cancelTimer.current) clearTimeout(cancelTimer.current); };
  }, [pending, cooldown]);

  function handleClick() {
    if (disabled) return;

    if (!pending) {
      setPending(true);
      // Dev mode: arm instantly with no cooldown; normal mode: arm + start timer
      if (!developerOptionsEnabled) setCooldown(true);
      return;
    }
    if (cooldown) return;
    setPending(false);
    onClick();
  }

  const cls = [
    'sg-action-btn',
    variant === 'danger' ? 'sg-action-btn--danger'   : '',
    pending              ? 'sg-action-btn--confirm'   : '',
    cooldown             ? 'sg-action-btn--cooldown'  : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={cls} onClick={handleClick} disabled={disabled}>
      {pending && !cooldown
        ? 'Confirm?'
        : <>{children}{cooldown && <span className="sg-action-btn-countdown">({countdown}s)</span>}</>
      }
    </button>
  );
}
