import type { ReactNode } from 'react';
import './Form.css';

interface Props {
  icon:       ReactNode;
  onClick:    () => void;
  active?:    boolean;
  title?:     string;
  className?: string;
}

export default function IconButton({ icon, onClick, active = false, title, className = '' }: Props) {
  return (
    <button
      className={`sg-icon-btn${active ? ' active' : ''}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {icon}
    </button>
  );
}
