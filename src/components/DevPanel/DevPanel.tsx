import { useEditMode } from '../../contexts/EditModeContext';
import { useWidgets } from '../../contexts/WidgetContext';
import './DevPanel.css';

const isExtension = typeof chrome !== 'undefined' && !!chrome.storage;

export default function DevPanel() {
  if (process.env.NODE_ENV !== 'development') return null;

  const { isEditMode } = useEditMode();
  const { widgets, loaded } = useWidgets();

  return (
    <div className="dev-panel">
      <div className="dev-panel-title">DEV</div>
      <div className="dev-row">
        <span className="dev-label">Storage</span>
        <span className={`dev-badge ${isExtension ? 'ok' : 'warn'}`}>
          {isExtension ? 'sync' : 'localStorage'}
        </span>
      </div>
      <div className="dev-row">
        <span className="dev-label">Edit-Mode</span>
        <span className={`dev-badge ${isEditMode ? 'ok' : 'off'}`}>
          {isEditMode ? 'ON' : 'OFF'}
        </span>
      </div>
      <div className="dev-row">
        <span className="dev-label">Widgets</span>
        <span className={`dev-badge ${loaded ? 'ok' : 'warn'}`}>
          {loaded ? widgets.length : '…'}
        </span>
      </div>
      <div className="dev-hint">Ctrl+E to toggle</div>
    </div>
  );
}
