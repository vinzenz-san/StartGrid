import type { CSSProperties } from 'react';
import { useElementInspectorHistory } from '../../contexts/ElementInspectorContext';
import { DEV_PANEL_WIDTH, type DevPanelPos } from './DevPanel';
import './InspectorHistoryPanel.css';

const HISTORY_WIDTH = 240;
const GAP = 16;

interface Props {
  devPanelPos: DevPanelPos;
}

export default function InspectorHistoryPanel({ devPanelPos }: Props) {
  const { copiedElements, clearCopiedElements } = useElementInspectorHistory();

  const fitsRight = devPanelPos.x + DEV_PANEL_WIDTH + GAP + HISTORY_WIDTH <= window.innerWidth;
  const left = fitsRight
    ? devPanelPos.x + DEV_PANEL_WIDTH + GAP
    : Math.max(0, devPanelPos.x - HISTORY_WIDTH - GAP);
  const style: CSSProperties = { left, top: devPanelPos.y };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(copiedElements.join('\n'));
  };

  return (
    <div className="sg-insp-history" style={style}>
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
