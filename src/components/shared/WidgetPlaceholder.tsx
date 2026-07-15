import type { Widget } from '../../types/widget';
import './WidgetPlaceholder.css';

interface Props {
  widget: Widget;
}

export default function WidgetPlaceholder({ widget }: Props) {
  const title = String(widget.data.title ?? 'Placeholder');
  return (
    <div className="sg-placeholder">
      <span className="sg-placeholder-icon">⬜</span>
      <span className="sg-placeholder-title">{title}</span>
      <span className="sg-placeholder-hint">Empty slot — use edit mode to remove or resize</span>
    </div>
  );
}
