import BackgroundEditor from '../Background/BackgroundEditor';
import './SettingsPanel.css';

interface Props { onClose: () => void; }

export default function SettingsPanel({ onClose }: Props) {
  return (
    <div className="sg-settings-panel" onClick={e => e.stopPropagation()}>
      <div className="sg-settings-header">
        <span className="sg-settings-title">Settings</span>
        <button className="sg-settings-close" onClick={onClose} title="Close">✕</button>
      </div>

      <div className="sg-settings-tabs">
        <button className="sg-settings-tab sg-settings-tab--active">Background</button>
      </div>

      <div className="sg-settings-content">
        <BackgroundEditor />
      </div>
    </div>
  );
}
