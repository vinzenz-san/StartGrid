import type { NotesData } from '../../../types/widget';
import { SettingsRow, SegmentedControl } from '../../shared/Form';
import './Notes.css';

interface Props {
  data: NotesData;
  onUpdateData: (patch: Partial<NotesData>) => void;
}

export function NotesSettings({ data, onUpdateData }: Props) {
  return (
    <div className="sg-notes-settings" onClick={e => e.stopPropagation()}>
      <SettingsRow label="Font size">
        <SegmentedControl
          options={[{ value: 'S', label: 'S' }, { value: 'M', label: 'M' }, { value: 'L', label: 'L' }]}
          value={data.fontSize ?? 'M'}
          onChange={v => onUpdateData({ fontSize: v as 'S' | 'M' | 'L' })}
        />
      </SettingsRow>
    </div>
  );
}

export default function Notes({ data, onUpdateData }: Props) {
  return (
    <textarea
      className={`sg-notes sg-notes--${(data.fontSize ?? 'M').toLowerCase()}`}
      value={data.content}
      placeholder="Type a note…"
      spellCheck={false}
      onChange={e => onUpdateData({ content: e.target.value })}
      onPointerDown={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      onDragStart={e => e.stopPropagation()}
    />
  );
}
