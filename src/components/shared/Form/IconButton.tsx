import type { ReactNode } from 'react';
import './Form.css';

interface Props {
  icon:       ReactNode;
  onClick:    () => void;
  active?:    boolean;
  title?:     string;
  className?: string;
  variant?:   'default' | 'ghost';
}

export default function IconButton({ icon, onClick, active = false, title, className = '', variant = 'default' }: Props) {
  return (
    <button
      className={`sg-icon-btn${variant === 'ghost' ? ' sg-icon-btn--ghost' : ''}${active ? ' active' : ''}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {icon}
    </button>
  );
}
