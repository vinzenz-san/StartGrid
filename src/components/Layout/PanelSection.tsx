import { Children, Fragment, type ReactNode } from 'react';
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
  children: ReactNode;
}

export function PanelSection({
  title,
  collapsible = false,
  persistenceKey,
  collapseGap = 'normal',
  children,
}: PanelSectionProps) {
  if (collapsible && !persistenceKey) {
    throw new Error(`PanelSection "${title}": persistenceKey is required when collapsible is true`);
  }

  // Hook is always called (rules of hooks) — it no-ops internally when the
  // section isn't collapsible (persistenceKey undefined).
  const [isOpen, toggle] = useSectionCollapse(collapsible ? persistenceKey : undefined);

  return (
    <section className="sg-panel-section">
      {collapsible ? (
        <button className="sg-section-header" onClick={toggle} aria-expanded={isOpen}>
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
 * Wraps a static or conditionally-rendered list of <PanelSection> children
 * and auto-inserts the `sg-settings-divider` <hr> between them — a new
 * section never needs a manually-placed divider, and one can never be
 * forgotten or duplicated when sections are reordered.
 *
 * Children.toArray already strips out null/undefined/boolean entries (the
 * result of `{condition && <PanelSection .../>}`), but the explicit filter
 * below documents that guarantee rather than relying on its implicit
 * behavior — a conditionally-hidden section (e.g. a future dev-only
 * section) never leaves an orphaned divider next to it.
 */
export function PanelSectionList({ children }: PanelSectionListProps) {
  const items = Children.toArray(children).filter(
    child => child !== null && child !== undefined && typeof child !== 'boolean',
  );

  return (
    <>
      {items.map((child, i) => (
        // Index keys are safe here — this list is static/conditional content,
        // never reordered at runtime.
        <Fragment key={i}>
          {i > 0 && <hr className="sg-settings-divider" />}
          {child}
        </Fragment>
      ))}
    </>
  );
}
