import type { CSSProperties, ReactNode } from 'react';
import './Form.css';

interface Props {
  label: string;
  children: ReactNode;
  style?: CSSProperties;
}

export default function SettingsRow({ label, children, style }: Props) {
  return (
    <div className="sg-form-row" style={style}>
      <span className="sg-form-label">{label}</span>
      {children}
    </div>
  );
}
