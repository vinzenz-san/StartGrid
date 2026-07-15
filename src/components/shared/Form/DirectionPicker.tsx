import './DirectionPicker.css';

interface Cell<T extends string> {
  value: T;
  arrow: string;
  col: number;
  row: number;
}

interface Props<T extends string> {
  cells: Cell<T>[];
  value: T;
  onChange: (v: T) => void;
  cols: number;
  rows: number;
  disabled?: boolean;
}

export default function DirectionPicker<T extends string>({ cells, value, onChange, cols, rows, disabled }: Props<T>) {
  return (
    <div
      className={`sg-dir-picker${disabled ? ' sg-dir-picker--disabled' : ''}`}
      style={{ '--dp-cols': cols, '--dp-rows': rows } as React.CSSProperties}
    >
      {cells.map(cell => (
        <button
          key={cell.value}
          className={`sg-dir-btn${value === cell.value ? ' active' : ''}`}
          style={{ gridColumn: cell.col, gridRow: cell.row }}
          onClick={() => !disabled && onChange(cell.value)}
          title={cell.value}
          disabled={disabled}
        >
          {cell.arrow}
        </button>
      ))}
    </div>
  );
}
