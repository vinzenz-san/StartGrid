import type { Widget } from '../../types/widget';
import './WidgetPlaceholder.css';

interface Props {
  widget: Widget;
}

export default function WidgetPlaceholder({ widget }: Props) {
  const title = String(widget.data.title ?? 'Widget');
  return (
    <div className="sg-placeholder">
      <span className="sg-placeholder-title">{title}</span>
      <span className="sg-placeholder-pos">col {widget.col}, row {widget.row}</span>
    </div>
  );
}
