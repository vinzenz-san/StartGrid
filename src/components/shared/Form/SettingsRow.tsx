import type { ReactNode } from 'react';
import './Form.css';

interface Props {
  label: string;
  children: ReactNode;
}

export default function SettingsRow({ label, children }: Props) {
  return (
    <div className="sg-form-row">
      <span className="sg-form-label">{label}</span>
      {children}
    </div>
  );
}
