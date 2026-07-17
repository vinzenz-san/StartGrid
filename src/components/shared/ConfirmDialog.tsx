import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './ConfirmDialog.css';

interface Props {
  open:          boolean;
  onClose:       () => void;
  onConfirm:     () => void;
  title:         string;
  body:          ReactNode;
  confirmLabel?: string;
  cancelLabel?:  string;
}

export default function ConfirmDialog({
  open, onClose, onConfirm, title, body,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
}: Props) {
  if (!open) return null;

  return createPortal(
    <div className="sg-confirm-dialog-backdrop" onPointerDown={onClose}>
      <div className="sg-confirm-dialog" onPointerDown={e => e.stopPropagation()}>
        <div className="sg-confirm-dialog-title">{title}</div>
        <p className="sg-confirm-dialog-body">{body}</p>
        <div className="sg-confirm-dialog-actions">
          <button className="sg-confirm-dialog-btn sg-confirm-dialog-btn--cancel" onClick={onClose}>
            {cancelLabel}
          </button>
          <button className="sg-confirm-dialog-btn sg-confirm-dialog-btn--confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
