import { useRef, useState } from 'react';
import type { TodoData, TodoItem } from '../../../types/widget';
import { SettingsRow, SettingsSwitch, ActionButton, IconButton } from '../../shared/Form';
import { useSettings } from '../../../contexts/SettingsContext';
import './TodoList.css';

function generateId() {
  return `td-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Settings ───────────────────────────────────────────────────────────────

interface SettingsProps {
  data: TodoData;
  onUpdateData: (patch: Partial<TodoData>) => void;
}

export function TodoListSettings({ data, onUpdateData }: SettingsProps) {
  const { t } = useSettings();
  const items = data.items ?? [];
  const hideCompleted = data.hideCompleted ?? false;
  const completedCount = items.filter(i => i.done).length;

  return (
    <>
      <SettingsRow label={t('widget.todoList.hideCompleted')}>
        <SettingsSwitch checked={hideCompleted} onChange={v => onUpdateData({ hideCompleted: v })} />
      </SettingsRow>
      <ActionButton
        variant="danger"
        disabled={completedCount === 0}
        onClick={() => onUpdateData({ items: items.filter(i => !i.done) })}
      >
        {t('widget.todoList.clearCompleted', { count: completedCount })}
      </ActionButton>
    </>
  );
}

// ── Widget ────────────────────────────────────────────────────────────────

interface Props {
  data: TodoData;
  onUpdateData: (patch: Partial<TodoData>) => void;
}

export default function TodoList({ data, onUpdateData }: Props) {
  const { t } = useSettings();
  const items = data.items ?? [];
  const hideCompleted = data.hideCompleted ?? false;
  const visibleItems = hideCompleted ? items.filter(i => !i.done) : items;

  const [draft, setDraft] = useState('');

  function addItem() {
    const text = draft.trim();
    if (!text) return;
    const next: TodoItem = { id: generateId(), text, done: false };
    onUpdateData({ items: [...items, next] });
    setDraft('');
  }

  function toggleItem(id: string) {
    onUpdateData({ items: items.map(i => (i.id === id ? { ...i, done: !i.done } : i)) });
  }

  function deleteItem(id: string) {
    onUpdateData({ items: items.filter(i => i.id !== id) });
  }

  // ── Pointer-based drag reorder — ported from Quicklinks.tsx's own
  // self-contained implementation (no shared drag hook exists in this
  // codebase). Vertical-only here, unlike Quicklinks' grid/row layouts.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const justDraggedRef = useRef(false);

  const handleItemDown = (e: React.PointerEvent<HTMLDivElement>, startIdx: number) => {
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const pointerId = e.pointerId;
    const tileEl = e.currentTarget;
    const startItems = [...visibleItems];

    let isDragging = false;
    let currentOver = startIdx;

    const onMove = (ev: PointerEvent) => {
      if (!isDragging) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 6) return;
        isDragging = true;
        tileEl.setPointerCapture(pointerId);
        setDragIndex(startIdx);
        setOverIndex(startIdx);
      }
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const item = el?.closest('[data-todo-index]') as HTMLElement | null;
      if (!item) return;
      const itemIdx = Number(item.dataset.todoIndex);
      if (isNaN(itemIdx)) return;
      const rect = item.getBoundingClientRect();
      const before = ev.clientY < rect.top + rect.height / 2;
      currentOver = before ? itemIdx : itemIdx + 1;
      setOverIndex(currentOver);
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      if (!isDragging) return;
      justDraggedRef.current = true;
      const adjusted = currentOver > startIdx ? currentOver - 1 : currentOver;
      if (adjusted !== startIdx) {
        // Reorder within the dragged (possibly hideCompleted-filtered)
        // subset first, exactly like Quicklinks does for its unfiltered
        // list — then splice that new sub-order back into the full `items`
        // array, leaving any hidden (done) items pinned at their existing
        // relative positions instead of being displaced by the drag.
        const reorderedVisible = [...startItems];
        const [removed] = reorderedVisible.splice(startIdx, 1);
        reorderedVisible.splice(adjusted, 0, removed);

        const visibleIds = new Set(startItems.map(i => i.id));
        let cursor = 0;
        const next = items.map(i => (visibleIds.has(i.id) ? reorderedVisible[cursor++] : i));
        onUpdateData({ items: next });
      }
      setDragIndex(null);
      setOverIndex(null);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  };

  return (
    <div className="sg-todo">
      <div className="sg-todo-add">
        <input
          className="sg-form-input"
          type="text"
          placeholder={t('widget.todoList.addPlaceholder')}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
        />
      </div>

      {visibleItems.length === 0 ? (
        <div className="sg-todo-empty">{t('widget.todoList.empty')}</div>
      ) : (
        <div className="sg-todo-list sg-scroll-thin">
          {visibleItems.map((item, idx) => (
            <div
              key={item.id}
              className={[
                'sg-todo-row',
                dragIndex === idx ? 'sg-todo-row--dragging' : '',
                dragIndex !== null && overIndex === idx ? 'sg-todo-row--drop-before' : '',
                dragIndex !== null && overIndex === idx + 1 && idx === visibleItems.length - 1 ? 'sg-todo-row--drop-after' : '',
              ].filter(Boolean).join(' ')}
              data-todo-index={idx}
              onPointerDown={e => handleItemDown(e, idx)}
              onDragStart={e => e.preventDefault()}
              onClickCapture={e => {
                if (justDraggedRef.current) {
                  justDraggedRef.current = false;
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            >
              <button
                role="checkbox"
                aria-checked={item.done}
                className={`sg-todo-check${item.done ? ' sg-todo-check--done' : ''}`}
                onClick={() => toggleItem(item.id)}
              >
                {item.done && '✓'}
              </button>
              <span className={`sg-todo-text${item.done ? ' sg-todo-text--done' : ''}`}>{item.text}</span>
              <IconButton
                className="sg-todo-delete"
                variant="ghost"
                title={t('widget.todoList.delete')}
                onClick={() => deleteItem(item.id)}
                active={false}
                icon={<span aria-hidden="true">✕</span>}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
