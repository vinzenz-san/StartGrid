import { useSettings } from '../../contexts/SettingsContext';
import { useElementInspectorHistory } from '../../contexts/ElementInspectorContext';
import './InspectorHistoryPanel.css';

export default function InspectorHistoryPanel() {
  const { devPanelPosition } = useSettings();
  const { copiedElements, clearCopiedElements } = useElementInspectorHistory();

  const hSide = devPanelPosition.endsWith('left') ? 'left' : 'right';
  const vSide = devPanelPosition.startsWith('top') ? 'top' : 'bottom';

  const handleCopyAll = () => {
    navigator.clipboard.writeText(copiedElements.join('\n'));
  };

  return (
    <div className={`sg-insp-history sg-insp-history--${hSide} sg-insp-history--${vSide}`}>
      <div className="sg-insp-history-title">Copy Stack</div>

      <div className="sg-insp-history-actions">
        <button className="sg-insp-history-btn" onClick={handleCopyAll} disabled={copiedElements.length === 0}>
          Copy All
        </button>
        <button className="sg-insp-history-btn" onClick={clearCopiedElements} disabled={copiedElements.length === 0}>
          Clear List
        </button>
      </div>

      <div className="sg-insp-history-list">
        {copiedElements.length === 0 ? (
          <span className="sg-insp-history-empty">Hover a sidebar element + press C to collect it here.</span>
        ) : (
          copiedElements.map((el, i) => (
            <div key={i} className="sg-insp-history-item">{el}</div>
          ))
        )}
      </div>
    </div>
  );
}
