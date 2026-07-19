import { Children, type ReactNode } from 'react';
import { useSectionCollapse } from '../../hooks/useSectionCollapse';
import './PanelSection.css';

interface PanelSectionProps {
  title: string;
  /** Renders a clickable header + chevron and persists open/closed state. */
  collapsible?: boolean;
  /** Required when collapsible — unique key for browser.storage.local persistence. */
  persistenceKey?: string;
  /** 'spacious' = extra header-to-content padding (Background's tab switcher). Only meaningful when collapsible. */
  collapseGap?: 'normal' | 'spacious';
  /** Initial open state before persisted storage resolves (and if nothing was ever persisted). Only meaningful when collapsible. */
  defaultOpen?: boolean;
  children: ReactNode;
}

export function PanelSection({
  title,
  collapsible = false,
  persistenceKey,
  collapseGap = 'normal',
  defaultOpen = false,
  children,
}: PanelSectionProps) {
  if (collapsible && !persistenceKey) {
    throw new Error(`PanelSection "${title}": persistenceKey is required when collapsible is true`);
  }

  // Hook is always called (rules of hooks) — it no-ops internally when the
  // section isn't collapsible (persistenceKey undefined).
  const [isOpen, toggle] = useSectionCollapse(collapsible ? persistenceKey : undefined, defaultOpen);

  // While collapsed, clicking anywhere in the section expands it (not just
  // the header/chevron) — the header's own click is stopped from bubbling
  // here so the two handlers don't both fire and cancel each other out.
  const collapsedClickable = collapsible && !isOpen;

  return (
    <section
      className={`sg-panel-section${collapsedClickable ? ' sg-panel-section--collapsed-clickable' : ''}`}
      onClick={collapsedClickable ? toggle : undefined}
    >
      {collapsible ? (
        <button className="sg-section-header" onClick={e => { e.stopPropagation(); toggle(); }} aria-expanded={isOpen}>
          <span className="settings-section-label">{title}</span>
          <span className="sg-section-chevron">{isOpen ? '∨' : '›'}</span>
        </button>
      ) : (
        <div className="settings-section-label">{title}</div>
      )}

      {collapsible ? (
        <div className={`sg-section-collapse${isOpen ? ' sg-section-collapse--expanded' : ''}`}>
          <div className={`sg-section-collapse-inner sg-section-collapse-inner--gap${collapseGap === 'spacious' ? ' sg-section-collapse-inner--gap-bg' : ''}`}>
            {children}
          </div>
        </div>
      ) : (
        <div className="sg-section-body">
          {children}
        </div>
      )}
    </section>
  );
}

interface PanelSectionListProps {
  children: ReactNode;
}

/**
 * Wraps a static or conditionally-rendered list of <PanelSection> children.
 * Spacing between sections comes entirely from each card's own padding/margin
 * (see .sg-panel-section) — no divider is inserted between them.
 *
 * Children.toArray already strips out null/undefined/boolean entries (the
 * result of `{condition && <PanelSection .../>}`), but the explicit filter
 * below documents that guarantee rather than relying on its implicit
 * behavior.
 */
export function PanelSectionList({ children }: PanelSectionListProps) {
  const items = Children.toArray(children).filter(
    child => child !== null && child !== undefined && typeof child !== 'boolean',
  );

  return <>{items}</>;
}
