import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useElementInspectorHistory } from '../../contexts/ElementInspectorContext';
import './ElementInspector.css';

const TOOLTIP_OFFSET = 14;

interface Props {
  active: boolean;
}

function describeElement(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const rawClass = el.className as unknown;
  const cls = (typeof rawClass === 'string' ? rawClass : (rawClass as SVGAnimatedString)?.baseVal ?? '').trim();
  return cls ? `<${tag} class="${cls}">` : `<${tag}>`;
}

/**
 * Dev-only hover inspector, active across the entire page. Mutates the hovered
 * element's outline directly via the DOM (not React state) to avoid re-render
 * spam on every mousemove — only the small floating tooltip re-renders.
 */
export function ElementInspector({ active }: Props) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [label, setLabel] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const hoveredRef = useRef<HTMLElement | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { addCopiedElement } = useElementInspectorHistory();

  // Measure the tooltip synchronously before paint and flip it to the left
  // of the cursor if it would overflow the right edge of the viewport —
  // mirrors native Windows context-menu behavior with no visible flicker.
  useLayoutEffect(() => {
    if (!label || !tooltipRef.current) return;
    const width = tooltipRef.current.getBoundingClientRect().width;
    setFlipped(pos.x + TOOLTIP_OFFSET + width > window.innerWidth);
  }, [label, pos.x, copied]);

  useEffect(() => {
    if (!active) return;

    const clearOutline = () => {
      if (hoveredRef.current) {
        hoveredRef.current.style.outline = '';
        hoveredRef.current = null;
      }
    };

    const handleMove = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (hoveredRef.current !== target) {
        clearOutline();
        target.style.outline = '1px dashed var(--accent)';
        hoveredRef.current = target;
        setLabel(describeElement(target));
      }
      setPos({ x: e.clientX, y: e.clientY });
    };

    const handleLeave = () => {
      clearOutline();
      setLabel(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'c') return;
      if (!hoveredRef.current) return;
      e.preventDefault();
      const text = describeElement(hoveredRef.current);
      navigator.clipboard.writeText(text).then(() => {
        addCopiedElement(text);
        setCopied(true);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopied(false), 1000);
      });
    };

    document.addEventListener('pointerover', handleMove);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseleave', handleLeave);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerover', handleMove);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseleave', handleLeave);
      document.removeEventListener('keydown', handleKeyDown);
      clearOutline();
      setLabel(null);
      setCopied(false);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, [active]);

  if (!active || !label) return null;

  return createPortal(
    <div
      ref={tooltipRef}
      className="sg-el-inspector-tooltip"
      style={{
        left: pos.x,
        top: pos.y,
        transform: `translate(${flipped ? `calc(-100% - ${TOOLTIP_OFFSET}px)` : `${TOOLTIP_OFFSET}px`}, ${TOOLTIP_OFFSET}px)`,
      }}
    >
      <code>{label}</code>
      {copied && <span className="sg-el-inspector-badge">✓ Copied!</span>}
    </div>,
    document.body,
  );
}
